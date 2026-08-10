import { buildAllPeopleKnowledge } from "../brain/engines/personKnowledgeEngine.ts";
import { buildMemoryInsightForPerson } from "../brain/engines/memoryInsightEngine.ts";
import type { Insight, PersonKnowledge } from "../brain/types.ts";
import { getAiEligibleKnowledge, type KnowledgeItem } from "../knowledge/index.ts";
import type { PersonRow } from "../repositories/person.types.ts";
import type { GiftRecord } from "../gifts/gift.types.ts";
import type { KnowledgeChangeHistoryRow } from "../repositories/knowledgeRepository.ts";
import { buildGiftOutcomeLearningSignals } from "../gift-intelligence/giftOutcomeLearningSignals.ts";
import { projectGiftOutcomeAiContext } from "../gift-intelligence/giftOutcomeAiContextPreview.ts";
import { canonicalRelationKey } from "./canonicalRelation.ts";
import type {
  PeoplePageViewModel,
  PersonBrainInsightViewModel,
  PersonHealthArea,
  PersonHealthViewModel,
  PersonKnowledgeValueViewModel,
  PersonKnowledgeConflictViewModel,
  PersonListItemViewModel,
  PersonProfileViewModel,
  PersonTimelineItemViewModel,
} from "./peopleData.types.ts";

const INTEREST_CATEGORIES = new Set([
  "interest", "hobby", "travel", "sport", "book", "movie", "music",
]);
const ACTIVE_GIFT_CATEGORIES = new Set(["idea", "selected", "purchased"]);

function meaningful(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function confirmedGiftOutcomes(gifts: readonly GiftRecord[], profileLearningEnabled: boolean): PersonProfileViewModel["confirmedGiftOutcomes"] {
  const outcomes = gifts.flatMap((gift) => gift.finalOutcome ? [{
    giftId: gift.id,
    giftTitle: gift.value,
    outcome: gift.finalOutcome.value,
    note: gift.finalOutcome.note,
    confirmedAt: gift.finalOutcome.confirmedAt,
    learningEnabled: gift.finalOutcome.learningEnabled,
  }] : []);
  const signals = new Map(buildGiftOutcomeLearningSignals(
    outcomes.filter((item) => profileLearningEnabled && item.learningEnabled),
  ).map((item) => [item.giftId, item]));
  return outcomes.map((item) => {
    const signal = signals.get(item.giftId);
    return {
      ...item,
      aiEligible: profileLearningEnabled && item.learningEnabled,
      category: signal?.category ?? "other",
      learningSignal: profileLearningEnabled && item.learningEnabled ? signal?.categorySignal ?? "insufficient" : "history_only",
    };
  });
}

function relationLabel(person: PersonRow): string | null {
  return meaningful(person.relation_label) ?? meaningful(person.relationship);
}

function relationKey(person: PersonRow) {
  return canonicalRelationKey(person.relation_key, relationLabel(person));
}

function localDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysUntilBirthday(value: string | null, now: Date): number | null {
  if (!value) return null;
  const birthday = localDate(value);
  if (!birthday) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

function activeVisible(items: readonly KnowledgeItem[]): KnowledgeItem[] {
  return items.filter((item) => item.state === "active" && item.kind !== "journal");
}

function valueModel(item: KnowledgeItem, history: readonly KnowledgeChangeHistoryRow[] = []): PersonKnowledgeValueViewModel | null {
  const value = meaningful(item.value) ?? meaningful(item.title) ?? meaningful(item.summary);
  return value ? {
    id: item.id,
    value,
    category: item.category,
    sourceKind: item.evidence.sourceKind,
    userConfirmed: item.classification?.userConfirmed === true,
    sourceExcerpt: item.evidence.originalText,
    capturedAt: item.evidence.capturedAt,
    changeHistory: history.map((change) => ({
      id: change.id,
      previousValue: change.previous_value,
      newValue: change.new_value,
      changedAt: change.changed_at,
    })),
  } : null;
}

function values(items: readonly KnowledgeItem[], historyByMemoryId: ReadonlyMap<string, readonly KnowledgeChangeHistoryRow[]> = new Map()): PersonKnowledgeValueViewModel[] {
  const seen = new Set<string>();
  const result: PersonKnowledgeValueViewModel[] = [];
  for (const item of items) {
    const model = valueModel(item, historyByMemoryId.get(item.id));
    const key = model?.value.toLocaleLowerCase();
    if (!model || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(model);
  }
  return result;
}

function normalizedConflictValue(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function knowledgeConflicts(items: readonly KnowledgeItem[]): PersonKnowledgeConflictViewModel[] {
  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of items) {
    if (item.kind !== "preference" || item.classification?.userConfirmed !== true || !item.value) continue;
    if (!["likes", "prefers", "dislikes", "avoids"].includes(item.polarity ?? "")) continue;
    const key = normalizedConflictValue(item.value);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const conflicts: PersonKnowledgeConflictViewModel[] = [];
  for (const [key, group] of groups) {
    const hasPositive = group.some((item) => item.polarity === "likes" || item.polarity === "prefers");
    const hasNegative = group.some((item) => item.polarity === "dislikes" || item.polarity === "avoids");
    if (!hasPositive || !hasNegative) continue;
    const sorted = [...group].sort((a, b) => (b.evidence.capturedAt ?? "").localeCompare(a.evidence.capturedAt ?? "") || a.id.localeCompare(b.id));
    conflicts.push({
      id: `knowledge-conflict:${sorted.map((item) => item.id).sort().join(":")}`,
      topic: group[0].value!,
      items: sorted.map((item) => ({
        id: item.id,
        value: item.value!,
        polarity: item.polarity === "likes" || item.polarity === "prefers" ? "positive" : "negative",
        sourceExcerpt: item.evidence.originalText,
        capturedAt: item.evidence.capturedAt,
      })),
    });
  }
  return conflicts.sort((a, b) => a.topic.localeCompare(b.topic));
}

function dueKnowledgeReview(items: readonly KnowledgeItem[], conflicts: readonly PersonKnowledgeConflictViewModel[], currentDate: Date): PersonProfileViewModel["knowledgeReview"] {
  const now = currentDate.getTime();
  if (!Number.isFinite(now)) return null;
  const conflictedIds = new Set(conflicts.flatMap((conflict) => conflict.items.map((item) => item.id)));
  const dueBefore = now - 180 * 86_400_000;
  const candidates = items.flatMap((item) => {
    if (item.classification?.userConfirmed !== true || conflictedIds.has(item.id) || !item.value) return [];
    const baseline = new Date(item.review?.reviewedAt ?? item.classification.classifiedAt ?? item.evidence.capturedAt ?? "").getTime();
    const snoozedUntil = new Date(item.review?.snoozedUntil ?? "").getTime();
    if (!Number.isFinite(baseline) || baseline > dueBefore || (Number.isFinite(snoozedUntil) && snoozedUntil > now)) return [];
    return [{ item, baseline }];
  }).sort((a, b) => a.baseline - b.baseline || a.item.id.localeCompare(b.item.id));
  const candidate = candidates[0];
  return candidate ? { knowledgeId: candidate.item.id, value: candidate.item.value!, lastConfirmedAt: new Date(candidate.baseline).toISOString() } : null;
}

function givenGift(item: KnowledgeItem): boolean {
  return item.kind === "gift"
    && item.category === "given"
    && item.classification?.userConfirmed === true;
}

function personHealth(
  person: PersonRow,
  items: readonly KnowledgeItem[],
  knowledge: PersonKnowledge,
  gifts: readonly GiftRecord[] = [],
): PersonHealthViewModel {
  const missing: PersonHealthArea[] = [];
  if (!person.birthday) missing.push("birthday");
  if (!items.some((item) => item.kind === "preference")) missing.push("preferences");
  if (!knowledge.interests.length && !knowledge.hobbies.length) missing.push("interests");
  if (
    !gifts.some((gift) => gift.lifecycle !== "given")
    && !items.some((item) => item.kind === "gift" && item.category !== null && ACTIVE_GIFT_CATEGORIES.has(item.category))
  ) missing.push("giftIdea");
  if (!items.some((item) => item.kind === "fact")) missing.push("importantFacts");
  if (!knowledge.memoriesCount) missing.push("memories");

  const completed = 6 - missing.length;
  const level = completed >= 5 ? "good" : completed >= 2 ? "partial" : "starting";
  const addMemoryUrl = `/care/add-memory?personId=${encodeURIComponent(person.id)}`;
  return {
    level,
    missingAreas: missing.map((id) => ({
      id,
      actionUrl: id === "memories" ? addMemoryUrl : null,
    })),
  };
}

function brainInsight(insight: Insight | null): PersonBrainInsightViewModel[] {
  if (!insight) return [];
  return [{
    id: insight.id,
    type: insight.type,
    priority: insight.priority,
    title: insight.title,
    description: insight.description ?? null,
    actionUrl: insight.action?.action ?? null,
  }];
}

function birthdayBrainEvent(person: PersonRow, now: Date) {
  const remaining = daysUntilBirthday(person.birthday, now);
  if (remaining === null) return null;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + remaining);
  const date = [target.getFullYear(), String(target.getMonth() + 1).padStart(2, "0"), String(target.getDate()).padStart(2, "0")].join("-");
  return {
    id: `birthday-${person.id}`,
    title: `Birthday ${person.name}`,
    date,
    is_important: true,
    person_name: person.name,
    category: "birthday",
    personId: person.id,
  };
}

function timeline(items: readonly KnowledgeItem[]): PersonTimelineItemViewModel[] {
  return items.flatMap((item): PersonTimelineItemViewModel[] => {
    const date = item.occurredOn ?? (givenGift(item) ? item.createdAt : null);
    const model = valueModel(item);
    if (!date || !model || (item.kind !== "experience" && !givenGift(item))) return [];
    return [{ id: item.id, kind: givenGift(item) ? "gift_given" : "memory", title: model.value, date }];
  }).sort((first, second) => second.date.localeCompare(first.date) || first.id.localeCompare(second.id));
}

function canonicalGiftTimeline(gifts: readonly GiftRecord[]): PersonTimelineItemViewModel[] {
  return gifts.flatMap((gift): PersonTimelineItemViewModel[] => {
    const date = gift.occurredOn ?? gift.createdAt;
    if (!date) return [];
    return [{
      id: `canonical-${gift.id}`,
      kind: `gift_${gift.lifecycle}`,
      title: gift.value,
      date,
      ...(gift.finalOutcome ? {
        giftOutcome: gift.finalOutcome.value,
        giftOutcomeNote: gift.finalOutcome.note,
      } : {}),
    }];
  });
}

function mergeGiftValues(
  legacy: PersonKnowledgeValueViewModel[],
  canonical: readonly GiftRecord[],
): PersonKnowledgeValueViewModel[] {
  const result = [...legacy];
  const seen = new Set(result.map((item) => item.value.toLocaleLowerCase()));
  for (const gift of canonical) {
    const key = gift.value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id: gift.id, value: gift.value, category: gift.lifecycle, sourceKind: "gift", userConfirmed: false, sourceExcerpt: null, capturedAt: gift.createdAt, changeHistory: [] });
  }
  return result;
}

export function buildPeoplePageViewModel({
  people,
  knowledge,
  currentDate = new Date(),
  isAuthenticated = true,
}: {
  people: PersonRow[];
  knowledge: KnowledgeItem[];
  currentDate?: Date;
  isAuthenticated?: boolean;
}): PeoplePageViewModel {
  const visible = activeVisible(knowledge);
  const byPerson = new Map<string, KnowledgeItem[]>();
  for (const item of visible) {
    if (!item.personId) continue;
    const group = byPerson.get(item.personId) ?? [];
    group.push(item);
    byPerson.set(item.personId, group);
  }
  const brainKnowledge = buildAllPeopleKnowledge({
    people: people.map(({ id, name }) => ({ id, name })),
    memories: getAiEligibleKnowledge(visible),
    currentDate,
  });
  const brainByPerson = new Map(brainKnowledge.map((item) => [item.personId, item]));

  const items: PersonListItemViewModel[] = people.map((person) => {
    const personItems = byPerson.get(person.id) ?? [];
    const computed = brainByPerson.get(person.id)!;
    const tags = [...computed.interests, ...computed.hobbies, ...computed.favoriteDrinks]
      .filter(Boolean).slice(0, 4);
    return {
      id: person.id,
      name: person.name,
      relationship: person.relationship,
      relationLabel: relationLabel(person),
      relationKey: relationKey(person),
      relationCategory: person.relation_category,
      gender: person.gender,
      birthday: person.birthday,
      daysUntilBirthday: daysUntilBirthday(person.birthday, currentDate),
      createdAt: person.created_at,
      tags,
      knowledgeItemCount: personItems.length,
      memoriesCount: computed.memoriesCount,
      searchText: [
        person.name,
        person.relationship,
        relationLabel(person),
        person.notes,
        person.phone,
        person.email,
        ...tags,
        ...values(personItems).map((item) => item.value),
      ].filter(Boolean).join(" "),
      href: `/people/${encodeURIComponent(person.id)}`,
    };
  });

  const health = people.map((person) => personHealth(person, byPerson.get(person.id) ?? [], brainByPerson.get(person.id)!));
  const nearest = items.filter((item) => item.daysUntilBirthday !== null)
    .sort((a, b) => a.daysUntilBirthday! - b.daysUntilBirthday! || a.name.localeCompare(b.name))[0];
  return {
    isAuthenticated,
    people: items,
    summary: {
      peopleCount: items.length,
      birthdaysThisWeek: items.filter((item) => item.daysUntilBirthday !== null && item.daysUntilBirthday <= 7).length,
      incompleteProfilesCount: health.filter((item) => item.level !== "good").length,
    },
    recommendation: nearest ? {
      personId: nearest.id,
      type: "upcoming_birthday",
      daysUntil: nearest.daysUntilBirthday!,
      actionUrl: nearest.href,
    } : null,
  };
}

export function buildPersonProfileViewModel({
  person,
  knowledge,
  knowledgeChanges = [],
  gifts = [],
  giftOutcomeLearningEnabled = true,
  currentDate = new Date(),
  isAuthenticated = true,
}: {
  person: PersonRow | null;
  knowledge: KnowledgeItem[];
  knowledgeChanges?: KnowledgeChangeHistoryRow[];
  gifts?: GiftRecord[];
  giftOutcomeLearningEnabled?: boolean;
  currentDate?: Date;
  isAuthenticated?: boolean;
}): PersonProfileViewModel {
  if (!person) return {
    isAuthenticated, found: false, hero: null, likes: [], dislikes: [], interests: [], giftIdeas: [], giftHistory: [], importantFacts: [], archivedKnowledge: [], knowledgeConflicts: [], knowledgeReview: null, timeline: [], brainInsights: [], confirmedGiftOutcomes: [], giftOutcomeAiPreview: [], giftOutcomeLearningEnabled: false, health: null,
    actions: { addMemoryUrl: null, addGiftIdeaUrl: null, addImportantInformationUrl: null, canAskHappy: false },
  };
  const visible = activeVisible(knowledge).filter((item) => item.personId === person.id);
  const archived = knowledge.filter((item) => item.personId === person.id && item.state === "archived" && item.kind !== "journal");
  const historyByMemoryId = new Map<string, KnowledgeChangeHistoryRow[]>();
  for (const change of knowledgeChanges) {
    const history = historyByMemoryId.get(change.memory_id) ?? [];
    history.push(change);
    historyByMemoryId.set(change.memory_id, history);
  }
  const aiSafe = getAiEligibleKnowledge(visible);
  const conflicts = knowledgeConflicts(visible);
  const [computed] = buildAllPeopleKnowledge({ people: [{ id: person.id, name: person.name }], memories: aiSafe, currentDate });
  const event = birthdayBrainEvent(person, currentDate);
  const insight = buildMemoryInsightForPerson({ person: { id: person.id, name: person.name }, event, memories: aiSafe, currentDate });
  const preferences = visible.filter((item) => item.kind === "preference");
  const interestRecords = preferences.filter((item) => item.category && INTEREST_CATEGORIES.has(item.category));
  const addMemoryUrl = `/care/add-memory?personId=${encodeURIComponent(person.id)}`;
  const outcomeAudit = confirmedGiftOutcomes(gifts, giftOutcomeLearningEnabled);
  return {
    isAuthenticated,
    found: true,
    hero: {
      id: person.id,
      name: person.name,
      relationLabel: relationLabel(person),
      relationKey: relationKey(person),
      gender: person.gender,
      birthday: person.birthday,
      daysUntilBirthday: daysUntilBirthday(person.birthday, currentDate),
    },
    likes: values(preferences.filter((item) => item.polarity === "likes" || item.polarity === "prefers"), historyByMemoryId),
    dislikes: values(preferences.filter((item) => item.polarity === "dislikes" || item.polarity === "avoids"), historyByMemoryId),
    interests: values(interestRecords, historyByMemoryId),
    giftIdeas: mergeGiftValues(
      values(visible.filter((item) => item.kind === "gift" && item.category !== null && ACTIVE_GIFT_CATEGORIES.has(item.category)), historyByMemoryId),
      gifts.filter((gift) => gift.lifecycle !== "given"),
    ),
    giftHistory: mergeGiftValues(values(visible.filter(givenGift), historyByMemoryId), gifts.filter((gift) => gift.lifecycle === "given")),
    importantFacts: values(visible.filter((item) => item.kind === "fact"), historyByMemoryId),
    archivedKnowledge: values(archived, historyByMemoryId),
    knowledgeConflicts: conflicts,
    knowledgeReview: dueKnowledgeReview(visible, conflicts, currentDate),
    timeline: [...timeline(visible), ...canonicalGiftTimeline(gifts)]
      .sort((first, second) => second.date.localeCompare(first.date) || first.id.localeCompare(second.id)),
    brainInsights: brainInsight(insight),
    confirmedGiftOutcomes: outcomeAudit,
    giftOutcomeAiPreview: projectGiftOutcomeAiContext(outcomeAudit.filter((item) => item.aiEligible).map((item) => ({ giftTitle: item.giftTitle, outcome: item.outcome, note: item.note, category: item.category, categorySignal: item.learningSignal === "history_only" ? "insufficient" : item.learningSignal }))),
    giftOutcomeLearningEnabled,
    health: personHealth(person, visible, computed, gifts),
    actions: { addMemoryUrl, addGiftIdeaUrl: null, addImportantInformationUrl: null, canAskHappy: true },
  };
}
