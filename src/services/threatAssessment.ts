/**
 * Unified threat-assessment structure for Alex (Phase 7).
 *
 * TEXT  → assessed by the existing OpenRouter text model.
 * PHOTO → assessed by the NVIDIA Nemotron multimodal model.
 * VOICE → NEVER assessed by AI. A completed voice recording directly
 *         activates the shared mock emergency (VOICE_TRIGGER) with no
 *         speech-to-text, no analysis, and no upload.
 */

export type ThreatSource = "TEXT" | "PHOTO" | "VOICE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ThreatAssessment {
  detected: boolean;
  riskLevel: RiskLevel;
  reason: string;
  source: ThreatSource;
}

/** No threat detected — the normal Alex conversation continues. */
export function noThreat(source: ThreatSource): ThreatAssessment {
  return { detected: false, riskLevel: "LOW", reason: "", source };
}

/** Parses a one-word model verdict ("HIGH" | "MEDIUM" | "LOW" | "NONE"). */
export function parseRiskVerdict(verdict: string | null | undefined): RiskLevel | null {
  if (!verdict) return null;
  const normalized = verdict.trim().toUpperCase();
  if (normalized.startsWith("HIGH")) return "HIGH";
  if (normalized.startsWith("MEDIUM")) return "MEDIUM";
  if (normalized.startsWith("LOW")) return "LOW";
  return null;
}

/** Heuristic escalation for PHOTO when no explicit risk line was produced. */
export function escalateFromKeywords(text: string, base: RiskLevel): RiskLevel {
  if (base === "HIGH") return "HIGH";
  if (/\b(attack|weapon|knife|gun|assault|chase|grab|threaten|bleed|hurt)\b/i.test(text)) {
    return "HIGH";
  }
  return base;
}
