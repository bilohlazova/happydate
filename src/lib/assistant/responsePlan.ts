import type { AssistantChatRequest } from "./chatContract.ts";

export type AssistantResponseIntent = "gift" | "schedule" | "person" | "general";

// Do not use \b here: JavaScript word boundaries are ASCII-oriented and fail
// for Cyrillic request text such as "подарунок" or "календар".
const GIFT_TERMS = /(gift|present|birthday|подар(?:унок|унки)|дарунок|презент|подарок|подарки|geschenk|geschenke|prezent|prezenty)/iu;
const SCHEDULE_TERMS = /(calendar|event|schedule|remind|plan(?:\s+my)?\s+day|календар|поді(?:я|ї)|нагад|розплан|план(?:\s+дня)?|событи|напомн|расписан|kalend|wydarzen|przypomn|termin|plan dnia|ereignis|erinner)/iu;
const PERSON_TERMS = /(likes?|prefer(?:s|ence)?|remember|relationship|люби(?:ть|ть)|подоба|пам.?ята|відносин|нрав|предпоч|помн|lubi|prefer|pamięta|beziehung|mag|vorlieb)/iu;

export function classifyAssistantResponseIntent(message: string): AssistantResponseIntent {
  if (GIFT_TERMS.test(message)) return "gift";
  if (SCHEDULE_TERMS.test(message)) return "schedule";
  if (PERSON_TERMS.test(message)) return "person";
  return "general";
}

/**
 * A short, deterministic instruction that turns the broad assistant prompt into
 * a useful response shape for the user's current request. It contains no
 * private facts, only facts already represented in the verified request.
 */
export function buildAssistantResponsePlan(request: AssistantChatRequest): string {
  const intent = classifyAssistantResponseIntent(request.message);
  const activePerson = request.context.activePerson;
  const hasActivePersonMemories = activePerson
    ? request.context.memories.some((group) => group.personName === activePerson.name && group.memories.length > 0)
    : false;
  const personState = request.context.personResolutionStatus === "ambiguous"
    ? "recipient is ambiguous"
    : activePerson
      ? `recipient is resolved; saved preference context is ${hasActivePersonMemories ? "available" : "not available"}`
      : "no recipient is resolved";

  const instructions: Record<AssistantResponseIntent, string> = {
    gift: `Intent: GIFT ADVICE. ${personState}. Give 2–3 meaningfully different gift directions, not a long shopping list. For each direction, state the concrete known signal that supports it; if there is no supporting signal, label it as a practical starting point rather than a personal match. Do not use gender as a shortcut for taste. Avoid duplicates, active saved ideas, and verified negative gift evidence. If budget, occasion, or timing is missing, still offer the best grounded direction first and ask only the single missing detail that would materially change the choice.`,
    schedule: "Intent: CALENDAR OR PLANNING. Answer with the exact known date, time, duration, location, or next action when it is available. Keep date certainty explicit, never imply that an event exists when it is absent, and offer one small planning step only when useful.",
    person: `Intent: PERSON CONTEXT. ${personState}. Separate saved facts from a helpful suggestion. If no saved fact exists, say that plainly and ask for one concrete fact that would make future help more personal.`,
    general: "Intent: GENERAL CARE QUESTION. Answer the user's exact question first. Use calendar and relationship context only when it clearly helps; do not force a gift or reminder suggestion into an unrelated answer.",
  };

  return `RESPONSE PLAN (SYSTEM INSTRUCTION)\n${instructions[intent]}`;
}
