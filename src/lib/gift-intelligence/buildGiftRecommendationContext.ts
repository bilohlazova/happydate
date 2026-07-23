import type { GiftLifecycle } from "../gifts/gift.types.ts";
import type {
  BuildGiftRecommendationContextInput,
  GiftIntelligenceGiftInput,
  GiftIntelligenceKnowledgeInput,
  GiftIntelligenceMissingSignal,
  GiftRecommendationContext,
  GiftSeasonSignal,
} from "./giftIntelligence.types.ts";

const ACTIVE_GIFT_STATES = new Set<GiftLifecycle>(["idea", "selected", "purchased"]);
const INTEREST_CATEGORIES = new Set([
  "interest",
  "hobby",
  "travel",
  "sport",
  "book",
  "movie",
  "music",
  "pet",
  "flower",
  "perfume",
]);

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizedKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function canonicalCurrency(value: string | null | undefined): string | null {
  const normalized = clean(value);
  return normalized ? normalized.toLocaleUpperCase() : null;
}

function localDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ageOnDate(birthday: string | null | undefined, currentDate: Date): number | null {
  const birthDate = localDate(birthday);
  if (!birthDate) return null;
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(
    currentDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  );
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  if (birthdayThisYear > today) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function daysUntil(date: string | null | undefined, currentDate: Date): number | null {
  const eventDate = localDate(date);
  if (!eventDate) return null;
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  eventDate.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
}

function seasonFor(currentDate: Date): GiftSeasonSignal {
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  if (month === 12 && day >= 1 && day <= 26) return "christmas";
  if ((month === 12 && day >= 27) || (month === 1 && day <= 6)) return "new_year";
  if (month === 2 && day >= 7 && day <= 14) return "valentines_day";
  if (month === 3 || month === 4) return "easter";
  if (month === 5 && day >= 20 && day <= 31) return "mothers_day";
  if (month === 6 && day >= 20 && day <= 26) return "fathers_day";
  if (month === 6 && day <= 7) return "childrens_day";
  return "none";
}

function knowledgeValue(item: GiftIntelligenceKnowledgeInput): string | null {
  return clean(item.value) ?? clean(item.title) ?? clean(item.summary);
}

function activeAiEligible(item: GiftIntelligenceKnowledgeInput): boolean {
  return item.state !== "archived" && item.kind !== "journal" && item.aiEligible !== false;
}

function pushUnique(target: string[], value: string | null): void {
  if (!value) return;
  const seen = new Set(target.map(normalizedKey));
  const key = normalizedKey(value);
  if (!seen.has(key)) target.push(value);
}

function relevantKnowledge(
  personId: string | null,
  knowledge: readonly GiftIntelligenceKnowledgeInput[],
): GiftIntelligenceKnowledgeInput[] {
  return knowledge.filter(
    (item) => activeAiEligible(item) && (!personId || item.personId === personId),
  );
}

function relevantGifts(
  personId: string | null,
  eventId: string | null,
  gifts: readonly GiftIntelligenceGiftInput[],
): GiftIntelligenceGiftInput[] {
  return gifts.filter((gift) =>
    (!personId || gift.personId === personId) &&
    (!eventId || !gift.eventId || gift.eventId === eventId)
  );
}

function sortedDate(value: { occurredOn?: string | null; createdAt?: string | null }): string {
  return value.occurredOn ?? value.createdAt ?? "";
}

function classifyKnowledge(
  knowledge: readonly GiftIntelligenceKnowledgeInput[],
): GiftRecommendationContext["preferences"] & Pick<GiftRecommendationContext, "memories"> {
  const preferences: GiftRecommendationContext["preferences"] = {
    likes: [],
    dislikes: [],
    interests: [],
    wishes: [],
    importantFacts: [],
  };
  const memories: GiftRecommendationContext["memories"] = [];
  const seenMemories = new Set<string>();

  for (const item of [...knowledge].sort((a, b) => sortedDate(b).localeCompare(sortedDate(a)) || a.id.localeCompare(b.id))) {
    const value = knowledgeValue(item);
    if (!value) continue;
    if (item.kind === "wish") {
      pushUnique(preferences.wishes, value);
    } else if (item.kind === "fact") {
      pushUnique(preferences.importantFacts, value);
    } else if (item.kind === "experience") {
      const key = normalizedKey(value);
      if (!seenMemories.has(key)) {
        seenMemories.add(key);
        memories.push({ id: item.id, value, occurredOn: item.occurredOn ?? null });
      }
    } else if (item.kind === "preference") {
      if (item.polarity === "dislikes" || item.polarity === "avoids") {
        pushUnique(preferences.dislikes, value);
      } else if (item.category && INTEREST_CATEGORIES.has(item.category)) {
        pushUnique(preferences.interests, value);
      } else if (item.polarity === "likes" || item.polarity === "prefers") {
        pushUnique(preferences.likes, value);
      } else {
        pushUnique(preferences.interests, value);
      }
    }
  }

  return { ...preferences, memories };
}

function buildGiftProjection(
  gifts: readonly GiftIntelligenceGiftInput[],
): GiftRecommendationContext["gifts"] {
  const lifecycleCounts: Record<GiftLifecycle, number> = {
    idea: 0,
    selected: 0,
    purchased: 0,
    given: 0,
  };
  const active: GiftRecommendationContext["gifts"]["active"] = [];
  const previous: GiftRecommendationContext["gifts"]["previous"] = [];
  const seenActive = new Set<string>();
  const seenPrevious = new Set<string>();

  for (const gift of [...gifts].sort((a, b) => sortedDate(b).localeCompare(sortedDate(a)) || a.id.localeCompare(b.id))) {
    lifecycleCounts[gift.lifecycle] += 1;
    const value = clean(gift.value);
    if (!value) continue;
    const key = normalizedKey(value);
    if (ACTIVE_GIFT_STATES.has(gift.lifecycle)) {
      if (!seenActive.has(key)) {
        seenActive.add(key);
        active.push({ id: gift.id, lifecycle: gift.lifecycle as Exclude<GiftLifecycle, "given">, value });
      }
    } else if (!seenPrevious.has(key)) {
      seenPrevious.add(key);
      previous.push({ id: gift.id, value, occurredOn: gift.occurredOn ?? gift.createdAt ?? null });
    }
  }

  return { active, previous, lifecycleCounts };
}

function missingSignals(context: GiftRecommendationContext): GiftIntelligenceMissingSignal[] {
  const missing: GiftIntelligenceMissingSignal[] = [];
  if (!context.person.id) missing.push("missing_person");
  if (!context.event.id) missing.push("missing_event");
  if (!context.person.relationKey) missing.push("missing_relationship");
  if (!context.person.gender || context.person.gender === "unspecified") missing.push("missing_gender");
  if (context.person.age === null) missing.push("missing_age");
  if (context.budget.amount === null) missing.push("missing_budget");
  if (
    !context.preferences.likes.length &&
    !context.preferences.interests.length &&
    !context.preferences.wishes.length
  ) missing.push("missing_preferences");
  if (!context.preferences.dislikes.length) missing.push("missing_dislikes");
  if (!context.memories.length) missing.push("missing_memories");
  if (!context.gifts.previous.length) missing.push("missing_previous_gifts");
  return missing;
}

export function buildGiftRecommendationContext({
  person = null,
  event = null,
  knowledge = [],
  gifts = [],
  budget = null,
  locale,
  currentDate = new Date(),
}: BuildGiftRecommendationContextInput): GiftRecommendationContext {
  const personId = person?.id ?? null;
  const eventId = event?.id ?? null;
  const scopedKnowledge = relevantKnowledge(personId, knowledge);
  const scopedGifts = relevantGifts(personId, eventId, gifts);
  const { memories, ...preferences } = classifyKnowledge(scopedKnowledge);
  const giftProjection = buildGiftProjection(scopedGifts);

  const context: GiftRecommendationContext = {
    locale,
    generatedAt: currentDate.toISOString(),
    person: {
      id: personId,
      relationKey: person?.relationKey ?? null,
      gender: person?.gender ?? null,
      age: ageOnDate(person?.birthday, currentDate),
    },
    event: {
      id: eventId,
      category: event?.category ?? null,
      date: event?.date ?? null,
      daysUntil: daysUntil(event?.date, currentDate),
    },
    budget: {
      amount: typeof budget?.amount === "number" && Number.isFinite(budget.amount) ? budget.amount : null,
      currency: canonicalCurrency(budget?.currency),
    },
    season: seasonFor(currentDate),
    preferences,
    memories,
    gifts: giftProjection,
    duplicateAvoidance: {
      previousGiftValues: giftProjection.previous.map((gift) => gift.value),
    },
    missingSignals: [],
  };
  return { ...context, missingSignals: missingSignals(context) };
}
