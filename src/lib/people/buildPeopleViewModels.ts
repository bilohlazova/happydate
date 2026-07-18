import { buildAllPeopleKnowledge } from "../brain/engines/personKnowledgeEngine.ts";
import { buildMemoryInsightForPerson } from "../brain/engines/memoryInsightEngine.ts";
import type { Insight, PersonKnowledge } from "../brain/types.ts";
import { getAiEligibleKnowledge, type KnowledgeItem } from "../knowledge/index.ts";
import type { PersonRow } from "../repositories/person.types.ts";
import type {
  PeoplePageViewModel,
  PersonBrainInsightViewModel,
  PersonHealthArea,
  PersonHealthViewModel,
  PersonKnowledgeValueViewModel,
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

function relationLabel(person: PersonRow): string | null {
  return meaningful(person.relation_label) ?? meaningful(person.relationship);
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

function valueModel(item: KnowledgeItem): PersonKnowledgeValueViewModel | null {
  const value = meaningful(item.value) ?? meaningful(item.title) ?? meaningful(item.summary);
  return value ? { id: item.id, value, category: item.category } : null;
}

function values(items: readonly KnowledgeItem[]): PersonKnowledgeValueViewModel[] {
  const seen = new Set<string>();
  const result: PersonKnowledgeValueViewModel[] = [];
  for (const item of items) {
    const model = valueModel(item);
    const key = model?.value.toLocaleLowerCase();
    if (!model || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(model);
  }
  return result;
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
): PersonHealthViewModel {
  const missing: PersonHealthArea[] = [];
  if (!person.birthday) missing.push("birthday");
  if (!items.some((item) => item.kind === "preference")) missing.push("preferences");
  if (!knowledge.interests.length && !knowledge.hobbies.length) missing.push("interests");
  if (!items.some((item) => item.kind === "gift" && item.category !== null && ACTIVE_GIFT_CATEGORIES.has(item.category))) missing.push("giftIdea");
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
      relationKey: person.relation_key,
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
  currentDate = new Date(),
  isAuthenticated = true,
}: {
  person: PersonRow | null;
  knowledge: KnowledgeItem[];
  currentDate?: Date;
  isAuthenticated?: boolean;
}): PersonProfileViewModel {
  if (!person) return {
    isAuthenticated, found: false, hero: null, likes: [], dislikes: [], interests: [], giftIdeas: [], giftHistory: [], importantFacts: [], timeline: [], brainInsights: [], health: null,
    actions: { addMemoryUrl: null, addGiftIdeaUrl: null, addImportantInformationUrl: null, canAskHappy: false },
  };
  const visible = activeVisible(knowledge).filter((item) => item.personId === person.id);
  const aiSafe = getAiEligibleKnowledge(visible);
  const [computed] = buildAllPeopleKnowledge({ people: [{ id: person.id, name: person.name }], memories: aiSafe, currentDate });
  const event = birthdayBrainEvent(person, currentDate);
  const insight = buildMemoryInsightForPerson({ person: { id: person.id, name: person.name }, event, memories: aiSafe, currentDate });
  const preferences = visible.filter((item) => item.kind === "preference");
  const interestRecords = preferences.filter((item) => item.category && INTEREST_CATEGORIES.has(item.category));
  const addMemoryUrl = `/care/add-memory?personId=${encodeURIComponent(person.id)}`;
  return {
    isAuthenticated,
    found: true,
    hero: { id: person.id, name: person.name, relationLabel: relationLabel(person), birthday: person.birthday, daysUntilBirthday: daysUntilBirthday(person.birthday, currentDate) },
    likes: values(preferences.filter((item) => item.polarity === "likes" || item.polarity === "prefers")),
    dislikes: values(preferences.filter((item) => item.polarity === "dislikes" || item.polarity === "avoids")),
    interests: values(interestRecords),
    giftIdeas: values(visible.filter((item) => item.kind === "gift" && item.category !== null && ACTIVE_GIFT_CATEGORIES.has(item.category))),
    giftHistory: values(visible.filter(givenGift)),
    importantFacts: values(visible.filter((item) => item.kind === "fact")),
    timeline: timeline(visible),
    brainInsights: brainInsight(insight),
    health: personHealth(person, visible, computed),
    actions: { addMemoryUrl, addGiftIdeaUrl: null, addImportantInformationUrl: null, canAskHappy: true },
  };
}
