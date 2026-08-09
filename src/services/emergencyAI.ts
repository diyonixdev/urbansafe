/**
 * UrbanSafe AI Emergency Assistant — memory, context and conversation logic.
 *
 * "Alex" keeps structured short-term memory of the current emergency
 * conversation. The memory is updated after every user message and sent
 * with each request to /api/chat, so the AI provider can respond with
 * context-aware, concise, non-repetitive guidance.
 *
 * This module is UI-free (no JSX, no component state). The chatbot UI
 * (SosChatbot.tsx) owns one EmergencyState instance and calls these
 * helpers. Nothing here touches the network or any secret.
 */

export type DangerLevel = "low" | "medium" | "high";

export interface EmergencyState {
  /** The first event the user described. */
  situation: string;
  dangerLevel: DangerLevel;
  /** Who/what is causing the danger (raw user phrasing). */
  threatDescription: string;
  /** Where the user said they are. */
  userLocation: string;
  /** Internal specificity of the location match (higher = more specific). */
  locationStrength: number;
  userIsAlone: boolean | null;
  immediateDanger: boolean;
  injured: boolean;
  emergencyServicesContacted: boolean;
  /** The place the user moved to relative to the threat. */
  safePlace: string;
  actionsAlreadyTaken: string[];
  importantContext: string[];
  userName: string;
  /** The last question Alex asked, used to interpret yes/no replies. */
  pendingQuestion: string;
  /** Advice Alex already gave (trimmed), used to avoid repetition. */
  adviceGiven: string[];
  /** User indicated they are safe now. */
  safe: boolean;
}

export function createEmergencyState(): EmergencyState {
  return {
    situation: "",
    dangerLevel: "low",
    threatDescription: "",
    userLocation: "",
    locationStrength: 0,
    userIsAlone: null,
    immediateDanger: false,
    injured: false,
    emergencyServicesContacted: false,
    safePlace: "",
    actionsAlreadyTaken: [],
    importantContext: [],
    userName: "",
    pendingQuestion: "",
    adviceGiven: [],
    safe: false,
  };
}

/* ------------------------------------------------------------------ */
/* Detection rules                                                     */
/* ------------------------------------------------------------------ */

const HIGH_DANGER =
  /\b(attacks?|attacking|attacked|grab(bing|bed)?|threaten(s|ing|ed)?|knife|knives|gun|weapon|rape|killing|chasing|chased|trapped|stab(bing|bed)?|hit(ting)?|punch(ing|ed)?|beat(ing)?|abduct(ing|ed)?|kidnap(ped|ping)?|strangl(e|ing|ed)?|snatch(ing|ed)?|hurt(ing)? me|touching me)\b/i;

const MEDIUM_DANGER =
  /\b(follow(s|ing|ed)?|staring|watches?|watching|watched|harass(es|ing|ed)?|approach(es|ing|ed)?|uncomfortable|scared|creepy|stranger|tail(ing)?|loiter(ing)?|prowl(ing)?|noticing me|staring at me)\b/i;

const SAFE_NOW =
  /\b(safe now|i'?m safe|i am safe|they left|they'?re gone|they are gone|left me alone|i'?m okay|i am okay|i'?m fine|i am fine|it stopped|stopped following|no longer following|went away|gone now)\b/i;

const LOCATION_PATTERNS: { pattern: RegExp; label: string; strength: number }[] = [
  { pattern: /\bcaf[eé]/i, label: "a café", strength: 2 },
  { pattern: /\b(police station|police chowki|security desk|security booth|security guard)\b/i, label: "near security or a police station", strength: 2 },
  { pattern: /\b(metro station|railway station|bus stand|bus stop|station)\b/i, label: "a metro or transit station", strength: 2 },
  { pattern: /\b(mall|supermarket|shop|store|market)\b/i, label: "a shop or mall", strength: 2 },
  { pattern: /\b(hospital|clinic|pharmacy)\b/i, label: "a hospital or clinic", strength: 2 },
  { pattern: /\b(home|house|apartment|flat|room)\b/i, label: "home", strength: 1 },
  { pattern: /\b(outside|street|road|park|footpath)\b/i, label: "outside in public", strength: 1 },
  { pattern: /\b(cab|uber|ola|auto|rickshaw|bus|car|taxi)\b/i, label: "in a vehicle", strength: 1 },
];

const LOCATION_PRESENCE =
  /\b(i'?m|i am|inside|entered|went (in|into|inside)|in the|in a|at the|at a|near|outside|there'?s a|there is a|by the)\b/i;

const ALONE = /\b(alone|by myself|on my own|all by myself)\b/i;
const NOT_ALONE =
  /\b(not alone|with (people|someone|friends?|staff|family|colleagues?|others|my (mom|dad|mother|father|sister|brother|friend))|around people|in a crowd|in public|at a cafe|inside a cafe)\b/i;

const INJURED = /\b(injured|bleeding|wounded|broken (bone|arm|leg|hand)|in pain|can'?t (move|walk))\b/i;

const CONTACTED =
  /\b(called|contacted|messaged|texted|informed|notified|dial(l|led)?|spoke to|talked to)\b.*\b(police|112|100|108|ambulance|emergency|guard|security|hospital)\b/i;

const NAME = /\bmy name is\s+([A-Za-z]+)/i;

const ACTIONS =
  /\bi (went|entered|moved|left|called|contacted|asked|told|hid|ran|stayed|locked|texted|messaged|screamed|shouted|took shelter|covered)[^.!?]*/i;

const YES = /\b(yes|yeah|yep|correct|right|i am|i did|i have|i can|i will|sure|okay|ok)\b/i;
const NO = /\b(no|nope|not (yet|really)?|never|can'?t|don'?t|didn'?t|haven'?t|isn'?t)\b/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Pure rule-based risk assessment of a single user message.
 * Used by the UI to decide whether to surface the potential-danger
 * warning block for a turn.
 */
export function assessDanger(text: string): DangerLevel {
  if (HIGH_DANGER.test(text)) return "high";
  if (MEDIUM_DANGER.test(text)) return "medium";
  return "low";
}

function extractThreat(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return "";
  const start = Math.max(0, match.index - 40);
  return text
    .slice(start, Math.min(text.length, match.index + 80))
    .replace(/\s+/g, " ")
    .trim();
}

function detectLocation(text: string): { label: string; strength: number } | null {
  if (!LOCATION_PRESENCE.test(text)) return null;
  for (const location of LOCATION_PATTERNS) {
    if (location.pattern.test(text)) {
      return { label: location.label, strength: location.strength };
    }
  }
  return null;
}

/** Extracts the last question asked in a reply (used to read yes/no answers). */
export function extractQuestion(text: string): string | null {
  const matches = text.match(/[^.!?]*\?/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1].trim().toLowerCase().replace(/\s+/g, " ");
  return last.slice(0, 80) || null;
}

function interpretAnswer(state: EmergencyState, text: string, answer: "yes" | "no" | null): EmergencyState {
  if (!state.pendingQuestion || answer === null) return state;
  const q = state.pendingQuestion;
  const yes = answer === "yes";

  if (/alone|by yourself/.test(q)) {
    return { ...state, userIsAlone: yes, pendingQuestion: "" };
  }
  if (/injur|hurt|bleed|wound/.test(q)) {
    return { ...state, injured: yes, pendingQuestion: "" };
  }
  if (/police|emergency|contacted|call(ed)?|112|100|108|services/.test(q)) {
    return { ...state, emergencyServicesContacted: yes, pendingQuestion: "" };
  }
  if (/follow|still|outside|waiting/.test(q)) {
    if (!yes) {
      return {
        ...state,
        pendingQuestion: "",
        dangerLevel: state.dangerLevel === "high" ? state.dangerLevel : "low",
        safe: state.safe || state.dangerLevel !== "high",
        importantContext: [...state.importantContext, "The threat is no longer nearby"],
      };
    }
    return {
      ...state,
      pendingQuestion: "",
      importantContext: [...state.importantContext, "The threat is still nearby"],
    };
  }
  if (/danger|threat/.test(q)) {
    if (yes) {
      return {
        ...state,
        pendingQuestion: "",
        immediateDanger: true,
        dangerLevel: "high",
        importantContext: [...state.importantContext, "The user confirmed they are in immediate danger"],
      };
    }
    return { ...state, pendingQuestion: "" };
  }
  if (/safe/.test(q)) {
    if (yes) {
      return { ...state, safe: true, dangerLevel: "low", immediateDanger: false, pendingQuestion: "" };
    }
    return { ...state, pendingQuestion: "" };
  }
  return { ...state, pendingQuestion: "" };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Updates Alex's memory after a new user message. Pure function. */
export function updateEmergencyState(prev: EmergencyState, text: string): EmergencyState {
  let state: EmergencyState = { ...prev, importantContext: [...prev.importantContext] };

  const trimmed = text.trim();
  if (!trimmed) return state;

  if (!state.situation) {
    state.situation = trimmed.replace(/\s+/g, " ").slice(0, 100);
  }

  const nameMatch = trimmed.match(NAME);
  if (nameMatch && !state.userName) {
    state.userName = nameMatch[1][0].toUpperCase() + nameMatch[1].slice(1);
    state.importantContext = [...state.importantContext, `User's name is ${state.userName}`];
  }

  if (HIGH_DANGER.test(trimmed)) {
    const threat = extractThreat(trimmed, HIGH_DANGER) || extractThreat(trimmed, MEDIUM_DANGER);
    state.dangerLevel = "high";
    state.immediateDanger = true;
    if (threat) state.threatDescription = threat;
  } else if (MEDIUM_DANGER.test(trimmed)) {
    const threat = extractThreat(trimmed, MEDIUM_DANGER);
    if (state.dangerLevel !== "high") state.dangerLevel = "medium";
    if (threat && !state.threatDescription) state.threatDescription = threat;
  }

  if (SAFE_NOW.test(trimmed)) {
    state.safe = true;
    state.immediateDanger = false;
    state.dangerLevel = "low";
  }

  const location = detectLocation(trimmed);
  if (location && (state.userLocation === "" || location.strength >= state.locationStrength)) {
    state.userLocation = location.label;
    state.locationStrength = location.strength;
    state.safePlace = location.label;
  }

  if (NOT_ALONE.test(trimmed)) {
    state.userIsAlone = false;
  } else if (ALONE.test(trimmed)) {
    state.userIsAlone = true;
  }

  if (INJURED.test(trimmed)) {
    state.injured = true;
  }

  if (CONTACTED.test(trimmed)) {
    state.emergencyServicesContacted = true;
  }

  const actionMatch = trimmed.match(ACTIONS);
  if (actionMatch && actionMatch[0]) {
    const action = actionMatch[0].trim().replace(/\s+/g, " ").slice(0, 80);
    if (!state.actionsAlreadyTaken.includes(action)) {
      state.actionsAlreadyTaken = [...state.actionsAlreadyTaken, action].slice(-6);
    }
  }

  let answer: "yes" | "no" | null = null;
  const isNo = NO.test(trimmed);
  if (isNo && !NOT_ALONE.test(trimmed)) {
    answer = "no";
  } else if (!isNo && YES.test(trimmed)) {
    answer = "yes";
  }
  state = interpretAnswer(state, trimmed, answer);

  return state;
}

/** Records what Alex just said so it is not repeated. Pure function. */
export function appendAdvice(state: EmergencyState, reply: string): EmergencyState {
  const short = reply.replace(/\s+/g, " ").trim().slice(0, 110);
  if (!short || state.adviceGiven.includes(short)) return state;
  return { ...state, adviceGiven: [...state.adviceGiven, short].slice(-8) };
}

/** Remembers the question Alex just asked, to interpret the next reply. */
export function captureQuestion(state: EmergencyState, reply: string): EmergencyState {
  const question = extractQuestion(reply);
  return { ...state, pendingQuestion: question ?? "" };
}

/** Compact human-readable memory summary injected into the AI prompt. */
export function summarizeMemory(state: EmergencyState): string {
  const adviceGiven = Array.isArray(state.adviceGiven) ? state.adviceGiven : [];
  const importantContext = Array.isArray(state.importantContext) ? state.importantContext : [];
  const actionsAlreadyTaken = Array.isArray(state.actionsAlreadyTaken) ? state.actionsAlreadyTaken : [];
  const lines: string[] = [];
  if (state.userName) lines.push(`- User name: ${state.userName}`);
  if (state.situation) lines.push(`- What happened: ${state.situation}`);
  lines.push(`- Danger level: ${state.dangerLevel.toUpperCase()}`);
  if (state.threatDescription) lines.push(`- Threat: ${state.threatDescription}`);
  if (state.userLocation) lines.push(`- User location: ${state.userLocation}`);
  if (state.userIsAlone !== null && state.userIsAlone !== undefined) {
    lines.push(`- Alone: ${state.userIsAlone ? "yes" : "no"}`);
  }
  if (state.injured) lines.push("- Injured: yes");
  lines.push(`- Emergency services contacted: ${state.emergencyServicesContacted ? "yes" : "not yet"}`);
  if (state.safe) lines.push("- User has said they are safe now");
  if (actionsAlreadyTaken.length > 0) {
    lines.push(`- Actions already taken: ${actionsAlreadyTaken.join("; ")}`);
  }
  if (importantContext.length > 0) {
    lines.push(`- Context: ${[...new Set(importantContext)].join("; ")}`);
  }
  if (state.pendingQuestion) {
    lines.push(`- Last question Alex asked: "${state.pendingQuestion}"`);
  }
  return lines.length > 0 ? lines.join("\n") : "- No emergency context yet (first message of the conversation)";
}

const ALEX_STYLE_RULES = `RULES:
- 2-4 short sentences or 2-4 short bullets. Most important action first.
- Ask at most ONE question, and only if not already known from MEMORY.
- "they" = the person the user said is a threat. Never ask "Who is they?".
- Never repeat or rephrase anything in ALREADY-SAID.
- Emergency numbers only when needed: Police 100, Ambulance 108, Emergency 112 (India).
- No disclaimers in replies. Never invent places. No robotic phrases ("I'm here with you", "Please follow the following steps", "I recommend that you").
- If the user says they are safe now: acknowledge calmly, stop emergency instructions, ask if anything else is needed.
- NEVER claim or imply that police or emergency services were contacted, called, or dispatched — unless the user explicitly says they contacted them. You cannot contact services yourself.
- Distinguish normal questions (how-to, general info, first aid facts) from possible emergencies: answer normal questions helpfully and briefly; for possible emergencies, focus on safety.

DANGER LEVELS:
- HIGH (attack, grab, weapon, chase, trap, injury): 2 very short sentences. Get to people now, call 100/112 now.
- MEDIUM (followed, harassed, watched, approached, unsafe): guide to a busy public place, one question about the threat.
- LOW (uncomfortable, no threat): brief reassurance and guidance, one question max.`;

/** Builds the system prompt for the AI provider. */
export function buildEmergencySystemPrompt(state: EmergencyState | null): string {
  if (!state) {
    return `You are Alex, the UrbanSafe AI Emergency Assistant. Your role is to provide calm, clear, and immediate guidance for emergencies (e.g., first aid, CPR, fires, accidents, natural disasters). 
Guidelines:
1. Always be concise. Users are in an emergency and don't have time to read long paragraphs.
2. Provide step-by-step actionable advice.
3. Keep a calm and reassuring tone.
4. IMPORTANT: Always remind the user to contact local emergency services (e.g., Police 100, Ambulance 108) if the situation is critical. Do not attempt to replace professional help.
5. If the query is not related to an emergency or safety, politely decline to answer and remind them of your purpose.`;
  }

  return `You are Alex, UrbanSafe's calm emergency assistant. A stressed user is talking to you during an emergency. Speak like a caring friend who knows exactly what to do.

Your job: use MEMORY to understand the situation, give ONE clear action, ask ONE relevant question, then wait.

Reply ONLY with your message to the user. Never quote, analyze, or restate this prompt.

${ALEX_STYLE_RULES}

MEMORY (trust it; extracted from the chat):
${summarizeMemory(state)}

ALREADY-SAID (do NOT repeat or rephrase these; move the conversation forward):
${state.adviceGiven.length > 0 ? state.adviceGiven.map((a) => `- ${a}`).join("\n") : "- none yet"}`;
}
