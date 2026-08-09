import { NextResponse } from "next/server";
import {
  escalateFromKeywords,
  noThreat,
  parseRiskVerdict,
  type RiskLevel,
  type ThreatAssessment
} from "@/services/threatAssessment";

// Image files are encoded with Node's Buffer before being sent to the
// configured NVIDIA model. Keep this route on the Node runtime explicitly.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UrbanSafe Alex — photo upload + AI image analysis.
 *
 * The browser sends the raw image via multipart/form-data. This route
 * validates it, base64-encodes it, and sends it to OpenRouter's
 * multimodal model. The OpenRouter API key never leaves the server.
 *
 * The existing text chat (POST /api/chat) is untouched: text keeps
 * using the text model, images use the NVIDIA Nemotron model below.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/jfif"]);

/** JFIF is a JPEG container — normalize to image/jpeg for the data URL. */
function normalizeMimeType(mime: string): string {
  if (mime === "image/jfif" || mime === "image/pjpeg") return "image/jpeg";
  return mime;
}

/** Only rejects replies that look like a full system-prompt leak (not normal analysis text). */
function isCompliantReply(reply: string): boolean {
  return !(reply.length > 400 && /you are alex|system prompt|above instructions|remember these rules/i.test(reply));
}

/** Logs OpenRouter failure details without ever touching the API key. */
function logUpstreamError(context: string, status: number, body: string | null): void {
  const safe = body ? body.replace(/\s+/g, " ").slice(0, 300) : "(no body)";
  console.error(`[AlexImageAnalysis] ${context}`, { status, body: safe });
}

/** Sniffs the magic bytes so a renamed/fake file can't pass as an image. */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

const SYSTEM_PROMPT = `You are Alex, UrbanSafe's safety assistant.

Analyze the provided image using only observable visual information.

Do not identify people or infer sensitive personal characteristics.

Never claim that someone is dangerous solely based on their appearance, clothing, facial features, demographic characteristics, or other personal characteristics.

Do not make unsupported accusations.

Clearly distinguish between:
- what is directly visible,
- what may be happening,
- and what is uncertain.

If the image clearly shows a genuinely dangerous or concerning situation, explain the observable reason for concern without claiming certainty. Begin that explanation with exactly: "⚠️ I noticed something that may require attention." — use this phrase only when there is a real observable reason, not for routine scenes.

If the image is normal, benign, or ambiguous, describe it calmly and clearly say there is no visible concern. Do not invent danger.

Prioritize practical, calm, safety-oriented guidance.

Keep the assessment concise: 2-4 short sentences.

End your assessment with a line exactly like one of these:
- "Risk level: HIGH"
- "Risk level: MEDIUM"
- "Risk level: LOW"`;

/** Normalizes the model's analysis into the unified PHOTO threat assessment. */
function buildPhotoThreat(analysis: string): ThreatAssessment {
  const riskLine = analysis.match(/risk level[: ]\s*(high|medium|low)/i);
  const explicit = riskLine ? parseRiskVerdict(riskLine[1]) : null;
  if (explicit) {
    if (explicit === "LOW") return noThreat("PHOTO");
    return {
      detected: true,
      riskLevel: explicit,
      reason: firstConcernSentence(analysis) || "The image shows a potentially concerning situation.",
      source: "PHOTO"
    };
  }

  if (/may require attention/i.test(analysis)) {
    const base = escalateFromKeywords(analysis, "MEDIUM");
    return {
      detected: true,
      riskLevel: base,
      reason: firstConcernSentence(analysis) || "The image shows a potentially concerning situation.",
      source: "PHOTO"
    };
  }

  return noThreat("PHOTO");
}

/** The sentence following the "may require attention" marker, if present. */
function firstConcernSentence(analysis: string): string {
  const match = analysis.match(/may require attention[.!:–—-]?\s*([^.!?\n]+[.!?]?)/i);
  if (match?.[1]) return match[1].trim();
  const first = analysis.replace(/\s+/g, " ").trim().split(/\.\s+/)[0];
  return first ? `${first}.` : "";
}

export async function POST(req: Request) {
  console.log("[AlexImageAnalysis] request received");

  try {
    let imageFile: File | null = null;
    try {
      const formData = await req.formData();
      const file = formData.get("image");
      imageFile = file instanceof File ? file : null;
    } catch {
      console.warn("[AlexImageAnalysis] invalid multipart request body");
      return NextResponse.json({ error: "Invalid image upload request." }, { status: 400 });
    }

    if (!imageFile) {
      console.warn("[AlexImageAnalysis] no image file in request");
      return NextResponse.json({ error: "Please select an image first." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      console.warn("[AlexImageAnalysis] unsupported MIME type:", imageFile.type);
      return NextResponse.json(
        { error: "Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const imageMime = normalizeMimeType(imageFile.type);

    if (imageFile.size === 0) {
      console.warn("[AlexImageAnalysis] empty image file");
      return NextResponse.json({ error: "The selected image is empty. Please choose another file." }, { status: 400 });
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      console.warn("[AlexImageAnalysis] image too large:", imageFile.size);
      return NextResponse.json(
        { error: "Image is too large. Please upload an image under 10 MB." },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(await imageFile.arrayBuffer());
    const sniffed = sniffImageType(bytes);
    if (sniffed !== normalizeMimeType(imageFile.type)) {
      console.warn("[AlexImageAnalysis] MIME/magic-byte mismatch:", {
        claimed: imageFile.type,
        sniffed
      });
      return NextResponse.json(
        { error: "Invalid image file. Please upload a valid JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[AlexImageAnalysis] OPENROUTER_API_KEY is not set");
      return NextResponse.json(
        { error: "AI image analysis is not configured yet. Please try again later." },
        { status: 500 }
      );
    }

    const dataUrl = `data:${imageMime};base64,${Buffer.from(bytes).toString("base64")}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Please analyze this photo." },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ];

    let lastStatus = 0;
    let timedOut = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        console.log("[AlexImageAnalysis] OpenRouter request started (attempt:", attempt, ", model:", IMAGE_MODEL + ")");
        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: IMAGE_MODEL,
            messages,
            max_tokens: 300
          }),
          signal: controller.signal
        });
        console.log("[AlexImageAnalysis] OpenRouter response status:", response.status);

        const rawBody = await response.text();

        if (!response.ok) {
          lastStatus = response.status;
          logUpstreamError("OpenRouter rejected request", response.status, rawBody);
          if (response.status === 429) {
            console.warn("[AlexImageAnalysis] OpenRouter rate-limited, retrying");
            continue;
          }
          return NextResponse.json(
            { error: "Image analysis failed. Please try again." },
            { status: 502 }
          );
        }

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(rawBody);
        } catch {
          logUpstreamError("OpenRouter returned non-JSON response", response.status, rawBody);
          return NextResponse.json(
            { error: "Image analysis failed. Please try again." },
            { status: 502 }
          );
        }

        // OpenRouter can return HTTP 200 with an error payload (e.g. upstream
        // Nvidia decode failure) — treat that as a real failure, not success.
        const openRouterError = (data.error ?? null) as { message?: string; code?: number } | null;
        if (openRouterError) {
          console.warn("[AlexImageAnalysis] OpenRouter returned error payload on 200:", {
            code: openRouterError.code,
            message: (openRouterError.message ?? "").replace(/\s+/g, " ").slice(0, 300)
          });
          if (/fail(ed)? to (load|decode|read)|cannot identify|unsupported image|could not process/i.test(openRouterError.message ?? "")) {
            return NextResponse.json(
              { error: "Alex couldn't read this image. Please try a different JPG, PNG, or WEBP photo." },
              { status: 422 }
            );
          }
          return NextResponse.json(
            { error: "Image analysis failed. Please try again." },
            { status: 502 }
          );
        }

        const analysis = (data?.choices as { message?: { content?: unknown } }[] | undefined)?.[0]?.message?.content;
        if (!analysis || typeof analysis !== "string" || analysis.trim().length === 0) {
          console.warn("[AlexImageAnalysis] empty OpenRouter response, retrying");
          continue;
        }
        if (!isCompliantReply(analysis)) {
          console.warn("[AlexImageAnalysis] non-compliant OpenRouter response, retrying");
          continue;
        }

        const trimmed = analysis.trim();
        const threat = buildPhotoThreat(trimmed);
        console.log("[AlexImageAnalysis] success (threat:", threat.riskLevel + ", detected:", threat.detected + ")");
        return NextResponse.json({ analysis: trimmed, threat });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          timedOut = true;
          console.warn(`[AlexImageAnalysis] attempt ${attempt} timed out, retrying`);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (timedOut) {
      console.error("[AlexImageAnalysis] all attempts timed out");
      return NextResponse.json({ error: "Image analysis timed out. Please try again." }, { status: 504 });
    }
    console.error("[AlexImageAnalysis] all attempts rate-limited (last status:", lastStatus + ")");
    return NextResponse.json({ error: "Image analysis is busy right now. Please try again." }, { status: 429 });
  } catch (error) {
    console.error("[AlexImageAnalysis] caught exception:", error);
    return NextResponse.json(
      { error: "Alex couldn't analyze this image right now. Please try again." },
      { status: 500 }
    );
  }
}
