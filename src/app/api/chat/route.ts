import { NextResponse } from "next/server";
import { buildEmergencySystemPrompt } from "@/services/emergencyAI";
import type { EmergencyState } from "@/services/emergencyAI";
import { noThreat, parseRiskVerdict, type RiskLevel, type ThreatAssessment } from "@/services/threatAssessment";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_ATTEMPTS = 2;

const PROMPT_ECHO_PATTERN = /(we need to|memory says|already-said|danger level|per rules|system prompt)/i;

/** Rejects replies where the model leaked its own instructions instead of answering. */
function isCompliantReply(reply: string): boolean {
  return !(reply.length > 300 && PROMPT_ECHO_PATTERN.test(reply));
}

function isEmergencyState(value: unknown): value is EmergencyState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.dangerLevel === "low" || candidate.dangerLevel === "medium" || candidate.dangerLevel === "high"
  );
}

const FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-26b-a4b-it:free"
];

const VERDICT_SYSTEM_PROMPT = `You are a safety-threat assessor for UrbanSafe, an emergency assistant.

Read the conversation. Assess whether the USER is describing a possible safety threat to themselves.

Reply with EXACTLY ONE WORD and nothing else:
- HIGH — a direct, active threat (attack, weapon, chase, injury, imminent danger).
- MEDIUM — a possible threat (being followed, harassed, approached, unsafe).
- LOW — mild discomfort with no real threat.
- NONE — no threat at all.

Never judge based on a person's appearance, clothing, race, gender, age, or other personal characteristics. Base the assessment only on observable events the user describes.`;

interface ModelResult {
  content: string;
  model: string;
}

/** One attempt at a chat-completions call over the candidate models. */
async function callModels(
  apiKey: string,
  systemPrompt: string,
  messages: unknown[],
  maxTokens: number,
  signal: AbortSignal
): Promise<ModelResult | null> {
  const models = [process.env.OPENROUTER_MODEL ?? FALLBACK_MODELS[0], ...FALLBACK_MODELS.filter((m) => m !== (process.env.OPENROUTER_MODEL ?? FALLBACK_MODELS[0]))];
  for (const candidate of models) {
    console.log("[EmergencyChat] AI provider request started (model:", candidate + ")");
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: candidate,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: maxTokens
      }),
      signal
    });
    console.log("[EmergencyChat] AI provider response status:", response.status);

    if (response.status === 429) {
      console.warn(`[EmergencyChat] AI provider rate-limited (${candidate}), trying next model`);
      continue;
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[EmergencyChat] AI provider rejected request:", {
        status: response.status,
        detail: errorData
      });
      throw new HttpError(response.status);
    }

    const data = await response.json();
    const aiReply = data?.choices?.[0]?.message?.content;
    if (!aiReply || typeof aiReply !== "string" || aiReply.trim().length === 0) {
      console.warn(`[EmergencyChat] empty AI provider response (${candidate}), trying next model`);
      continue;
    }
    if (maxTokens > 200 && !isCompliantReply(aiReply)) {
      console.warn(`[EmergencyChat] non-compliant AI provider response (${candidate}), trying next model`);
      continue;
    }
    console.log("[EmergencyChat] AI provider responded (model:", candidate + ")");
    return { content: aiReply, model: candidate };
  }
  return null;
}

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

/** Runs the main conversation reply and the threat verdict in parallel. */
async function fetchReplyAndVerdict(
  apiKey: string,
  systemMessage: { role: string; content: string },
  messages: unknown[],
  state: EmergencyState | null
): Promise<{ result: ModelResult | null; verdict: RiskLevel | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let timedOut = false;

  const lastUserMessage = [...messages].reverse().find((m) => (m as { role?: string })?.role === "user");

  const replyPromise = (async (): Promise<ModelResult | null> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await callModels(apiKey, systemMessage.content, messages, 150, controller.signal);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          timedOut = true;
          console.warn(`[EmergencyChat] reply attempt ${attempt} timed out, retrying`);
          continue;
        }
        throw error;
      }
    }
    return null;
  })();

  const verdictPromise = (async (): Promise<RiskLevel | null> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const verdictMessages = lastUserMessage ? messages : [];
        const result = await callModels(apiKey, VERDICT_SYSTEM_PROMPT, verdictMessages, 8, controller.signal);
        if (!result) return null;
        return parseRiskVerdict(result.content);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          timedOut = true;
          console.warn(`[EmergencyChat] verdict attempt ${attempt} timed out, retrying`);
          continue;
        }
        throw error;
      }
    }
    return null;
  })();

  try {
    const [replyResult, verdictResult] = await Promise.all([replyPromise, verdictPromise]);
    return { result: replyResult, verdict: verdictResult, timedOut };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Builds the normalized TEXT threat assessment from the AI verdict (or state fallback). */
function buildTextThreat(verdict: RiskLevel | null, state: EmergencyState | null): ThreatAssessment {
  const fallbackLevel: RiskLevel | null =
    state?.dangerLevel === "high" ? "HIGH" : state?.dangerLevel === "medium" ? "MEDIUM" : null;

  const level = verdict ?? fallbackLevel;
  if (!level || level === "LOW") return noThreat("TEXT");

  const detail = state?.threatDescription || state?.situation;
  const reason = detail ? `The user reports: ${detail}` : "The conversation indicates a possible safety threat.";
  return { detected: true, riskLevel: level, reason, source: "TEXT" };
}

export async function POST(req: Request) {
  console.log("[EmergencyChat] request received");

  try {
    let messages: unknown;
    let state: unknown;
    try {
      const body = await req.json();
      messages = body?.messages;
      state = body?.state ?? null;
      console.log("[EmergencyChat] received fields:", {
        hasMessages: Array.isArray(messages),
        messageCount: Array.isArray(messages) ? messages.length : 0,
        hasState: Boolean(state)
      });
    } catch {
      console.warn("[EmergencyChat] invalid JSON request body");
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn("[EmergencyChat] invalid messages format");
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL ?? FALLBACK_MODELS[0];
    console.log("[EmergencyChat] env check:", {
      OPENROUTER_API_KEY_SET: Boolean(apiKey),
      model
    });

    if (!apiKey) {
      console.error("[EmergencyChat] OPENROUTER_API_KEY is not set");
      return NextResponse.json(
        { error: "AI service is not configured. Add OPENROUTER_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const emergencyState = isEmergencyState(state) ? state : null;
    const systemMessage = {
      role: "system",
      content: buildEmergencySystemPrompt(emergencyState)
    };

    let timedOut = false;
    try {
      const { result, verdict, timedOut: replyTimedOut } = await fetchReplyAndVerdict(apiKey, systemMessage, messages, emergencyState);

      if (!result) {
        timedOut = replyTimedOut;
      } else {
        const threat = buildTextThreat(verdict, emergencyState);
        console.log("[EmergencyChat] success (threat:", threat.riskLevel + ", detected:", threat.detected + ")");
        const response = NextResponse.json({ response: result.content, threat });
        response.headers.set("x-model", result.model);
        return response;
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: "AI provider request failed", status: error.status },
          { status: error.status >= 500 ? 502 : 400 }
        );
      }
      if (!(error instanceof Error && error.name === "AbortError")) {
        throw error;
      }
    }

    if (timedOut) {
      console.error("[EmergencyChat] all attempts timed out");
      return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
    }
    console.error("[EmergencyChat] all AI provider models rate-limited");
    return NextResponse.json({ error: "AI service is busy right now" }, { status: 429 });
  } catch (error) {
    console.error("[EmergencyChat] caught exception:", error);
    return NextResponse.json({ error: "AI service request failed" }, { status: 500 });
  }
}
