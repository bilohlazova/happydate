const ACKNOWLEDGEMENTS = new Set([
  "так",
  "ні",
  "нi",
  "ок",
  "okay",
  "ok",
  "добре",
  "yes",
  "no",
  "tak",
  "nie",
  "dobra",
  "хорошо",
  "да",
  "нет",
]);

const FACT_HINTS = [
  "любить",
  "любит",
  "lubi",
  "likes",
  "подобається",
  "нравится",
  "nie lubi",
  "не любить",
  "не любит",
  "dislikes",
  "doesn't like",
  "does not like",
  "hobby",
  "хобі",
  "хобби",
  "brand",
  "бренд",
  "марка",
  "styl",
  "style",
  "стиль",
];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBudgetOrUrgencyOnly(value: string): boolean {
  return /^(budget|budżet|бюджет)?\s*\d+([\s,.]\d+)?\s*(zł|zl|pln|грн|uah|€|eur|\$|usd)?$/i.test(value)
    || /^(today|tomorrow|urgent|pilne|dzisiaj|jutro|терміново|срочно|сьогодні|завтра)$/i.test(value);
}

export function shouldRunChatMemoryDetection(input: {
  activePersonId: string | null;
  userMessage: string;
  resolvedOnlyName?: string | null;
}): boolean {
  if (!input.activePersonId) return false;
  const normalized = normalize(input.userMessage);
  if (!normalized || normalized.length < 8) return false;
  if (ACKNOWLEDGEMENTS.has(normalized)) return false;
  if (input.resolvedOnlyName && normalized === normalize(input.resolvedOnlyName)) return false;
  if (isBudgetOrUrgencyOnly(input.userMessage.trim())) return false;
  return FACT_HINTS.some((hint) => normalized.includes(normalize(hint)));
}

export const chatMemoryPrecheckTestUtils = {
  normalize,
  isBudgetOrUrgencyOnly,
};
