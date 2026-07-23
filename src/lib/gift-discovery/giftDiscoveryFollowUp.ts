import type {
  GiftDiscoveryQuestion,
  GiftDiscoveryQuestionType,
  GiftDiscoverySession,
} from "./giftDiscovery.types.ts";

const QUESTION_TEXT: Record<string, Record<GiftDiscoveryQuestionType, string>> = {
  pl: {
    budget: "Jaki budżet mam przyjąć na ten prezent?",
    relationshipStrength: "Jak bliska jest Wasza relacja?",
    interests: "Jakie zainteresowania tej osoby są teraz najważniejsze?",
    hobbies: "Jakie hobby sprawia tej osobie najwięcej radości?",
    preferredStyle: "Jaki styl prezentów najbardziej pasuje do tej osoby?",
    favoriteBrands: "Czy ta osoba ma ulubione marki lub miejsca?",
    dislikedGifts: "Jakich prezentów lepiej unikać?",
    urgency: "Na kiedy prezent powinien być gotowy?",
  },
  uk: {
    budget: "Який бюджет варто врахувати для цього подарунка?",
    relationshipStrength: "Наскільки близькі ваші стосунки?",
    interests: "Які інтереси цієї людини зараз найважливіші?",
    hobbies: "Яке хобі приносить цій людині найбільше радості?",
    preferredStyle: "Який стиль подарунків найбільше пасує цій людині?",
    favoriteBrands: "Чи має ця людина улюблені бренди або місця?",
    dislikedGifts: "Яких подарунків краще уникати?",
    urgency: "До якої дати подарунок має бути готовий?",
  },
  en: {
    budget: "What budget should I use for this gift?",
    relationshipStrength: "How close is your relationship?",
    interests: "Which interests matter most to this person right now?",
    hobbies: "Which hobby brings this person the most joy?",
    preferredStyle: "What gift style fits this person best?",
    favoriteBrands: "Does this person have favorite brands or places?",
    dislikedGifts: "Which gifts should I avoid?",
    urgency: "When should the gift be ready?",
  },
  ru: {
    budget: "Какой бюджет стоит учесть для этого подарка?",
    relationshipStrength: "Насколько близки ваши отношения?",
    interests: "Какие интересы этого человека сейчас самые важные?",
    hobbies: "Какое хобби приносит этому человеку больше всего радости?",
    preferredStyle: "Какой стиль подарков лучше всего подходит этому человеку?",
    favoriteBrands: "Есть ли у этого человека любимые бренды или места?",
    dislikedGifts: "Каких подарков лучше избегать?",
    urgency: "К какой дате подарок должен быть готов?",
  },
  de: {
    budget: "Welches Budget soll ich für dieses Geschenk berücksichtigen?",
    relationshipStrength: "Wie eng ist eure Beziehung?",
    interests: "Welche Interessen sind dieser Person gerade am wichtigsten?",
    hobbies: "Welches Hobby macht dieser Person am meisten Freude?",
    preferredStyle: "Welcher Geschenkstil passt am besten zu dieser Person?",
    favoriteBrands: "Hat diese Person Lieblingsmarken oder Lieblingsorte?",
    dislikedGifts: "Welche Geschenke sollte ich vermeiden?",
    urgency: "Bis wann soll das Geschenk bereit sein?",
  },
};

function localeBucket(locale: string): Record<GiftDiscoveryQuestionType, string> {
  return QUESTION_TEXT[locale] ?? QUESTION_TEXT.pl;
}

function candidateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function questionMatchesCandidate(
  question: GiftDiscoveryQuestion,
  candidate: string,
): boolean {
  return candidate === question.id || candidate === question.type;
}

function selectQuestions(
  session: GiftDiscoverySession,
  modelQuestions: unknown,
  maxQuestions: number,
): GiftDiscoveryQuestion[] {
  const remaining = session.remainingQuestions;
  if (!remaining.length || maxQuestions <= 0) return [];
  const candidates = Array.isArray(modelQuestions)
    ? modelQuestions.map(candidateKey).filter((item): item is string => Boolean(item))
    : [];
  const selected = new Set<string>();
  const result: GiftDiscoveryQuestion[] = [];

  for (const question of remaining) {
    if (!candidates.some((candidate) => questionMatchesCandidate(question, candidate))) {
      continue;
    }
    if (selected.has(question.id)) continue;
    selected.add(question.id);
    result.push(question);
    if (result.length >= maxQuestions) return result;
  }

  for (const question of remaining) {
    if (result.length >= maxQuestions) return result;
    if (selected.has(question.id)) continue;
    selected.add(question.id);
    result.push(question);
  }

  return result;
}

export function buildGiftDiscoveryFollowUpQuestions(
  session: GiftDiscoverySession,
  modelQuestions: unknown,
  maxQuestions = 3,
): string[] {
  const labels = localeBucket(session.locale);
  return selectQuestions(session, modelQuestions, maxQuestions)
    .map((question) => labels[question.type]);
}
