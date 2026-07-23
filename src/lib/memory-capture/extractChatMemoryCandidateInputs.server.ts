import type {
  MemoryCaptureAiCandidateInput,
  MemoryCaptureCandidateType,
} from "./memoryCapture.types.ts";

const UNCERTAIN_WORDS = [
  "maybe",
  "probably",
  "perhaps",
  "może",
  "chyba",
  "prawdopodobnie",
  "можливо",
  "мабуть",
  "напевно",
  "возможно",
  "наверное",
  "кажется",
];
const BUDGET_OR_URGENCY = /\b(бюджет|budget|budżet|терміново|срочно|urgent|pilne|today|tomorrow|сьогодні|завтра)\b/iu;
const TEMPORARY = /\b(сьогодні|завтра|today|tomorrow|this week|w tym tygodniu|на цей раз|tym razem)\b/iu;

function cleanValue(value: string): string | null {
  const normalized = value
    .replace(/[.!?。]+$/gu, "")
    .replace(/^["'“”„«»\s]+|["'“”„«»\s]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 120) return null;
  if (BUDGET_OR_URGENCY.test(normalized)) return null;
  return normalized;
}

function candidate(
  type: MemoryCaptureCandidateType,
  value: string | null,
): MemoryCaptureAiCandidateInput[] {
  return value
    ? [{ type, value, confidence: "high", explicit: true }]
    : [];
}

function firstMatch(
  message: string,
  patterns: RegExp[],
): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(message);
    const raw = match?.[1] ?? null;
    const value = raw ? cleanValue(raw) : null;
    if (value) return value;
  }
  return null;
}

function likelyBrand(value: string): boolean {
  return /^[A-ZА-ЯІЇЄҐ][\p{Letter}\p{Number}&.'’ -]{1,40}$/u.test(value)
    && value.split(/\s+/).length <= 3;
}

export async function extractChatMemoryCandidateInputs({
  userMessage,
}: {
  userMessage: string;
  locale: string;
}): Promise<MemoryCaptureAiCandidateInput[]> {
  const message = userMessage.trim();
  const lowerMessage = message.toLocaleLowerCase();
  if (!message || UNCERTAIN_WORDS.some((word) => lowerMessage.includes(word)) || TEMPORARY.test(message)) return [];

  const dislikedGift = firstMatch(message, [
    /(?:не\s+любить\s+отримувати|не\s+любит\s+получать|не\s+любить|не\s+любит|не\s+подобається|не\s+нравится|nie\s+lubi|does\s+not\s+like|doesn't\s+like|dislikes)\s+([^.!?\n]{2,120})/iu,
    /(?:уникає|unika|avoids)\s+([^.!?\n]{2,120})/iu,
  ]);
  if (dislikedGift) return candidate("disliked_gift", dislikedGift);

  const explicitBrand = firstMatch(message, [
    /(?:улюблен(?:ий|а)\s+бренд|бренд|марка|favorite\s+brand|ulubiona\s+marka)\s*[:—-]?\s*([^.!?\n]{2,120})/iu,
  ]);
  if (explicitBrand) return candidate("favorite_brand", explicitBrand);

  const likedValue = firstMatch(message, [
    /(?:любить|любит|lubi|likes|подобається|нравится)\s+([^.!?\n]{2,120})/iu,
  ]);
  if (likedValue) {
    if (likelyBrand(likedValue)) return candidate("favorite_brand", likedValue);
    return candidate("interest", likedValue);
  }

  const hobby = firstMatch(message, [
    /(?:хобі|хобби|hobby|zainteresowanie|захоплення)\s*[:—-]?\s*([^.!?\n]{2,120})/iu,
  ]);
  if (hobby) return candidate("hobby", hobby);

  const preferredStyle = firstMatch(message, [
    /(?:стиль|styl|style)\s*[:—-]?\s*([^.!?\n]{2,120})/iu,
  ]);
  if (preferredStyle) return candidate("preferred_style", preferredStyle);

  return [];
}
