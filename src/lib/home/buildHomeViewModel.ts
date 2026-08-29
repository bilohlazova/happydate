import type {
  HomeEvent,
  HomeFeaturedEvent,
  HomeKnowledgeReview,
  HomeMemory,
  HomePerson,
  HomeRecommendation,
  HomeRepositoryData,
  HomeTranslate,
  HomeUpcomingEvent,
  HomeViewModel,
} from "./home.types";
import type { AppLocale } from "@/i18n/config";
import { buildDailyBriefing } from "./buildDailyBriefing.ts";

const IMPORTANT_CATEGORIES = new Set(["birthday", "anniversary"]);

function localDate(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysUntil(date: Date, now: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

function nextBirthday(value: string, now: Date): Date | null {
  const birthday = localDate(value);
  if (!birthday) return null;
  const today = startOfDay(now);
  let occurrence = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (occurrence < today) {
    occurrence = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
  }
  return occurrence;
}

function searchableText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function isStoredBirthdayDuplicate(
  event: HomeRepositoryData["events"][number],
  birthdayEvents: HomeEvent[],
  peopleById: ReadonlyMap<string, HomePerson>,
): boolean {
  if (event.category?.trim().toLowerCase() !== "birthday") return false;
  const date = localDate(event.date);
  if (!date) return false;
  const dateOnly = toDateOnly(date);

  if (event.personId) {
    return birthdayEvents.some((birthday) => (
      birthday.personId === event.personId && birthday.date === dateOnly
    ));
  }

  const normalizedTitle = ` ${searchableText(event.title)} `;
  return birthdayEvents.some((birthday) => {
    if (birthday.date !== dateOnly || !birthday.personId) return false;
    const person = peopleById.get(birthday.personId);
    const normalizedName = person ? searchableText(person.name) : "";
    return normalizedName.length > 0 && normalizedTitle.includes(` ${normalizedName} `);
  });
}

function normalizeEvents(people: HomePerson[], storedEvents: HomeRepositoryData["events"], now: Date): HomeEvent[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const birthdayEvents = people.flatMap((person): HomeEvent[] => {
    if (!person.birthday) return [];
    const date = nextBirthday(person.birthday, now);
    if (!date) return [];
    return [{
      id: `birthday-${person.id}`,
      source: "birthday",
      title: person.name,
      date: toDateOnly(date),
      timeOfDay: null,
      durationMinutes: null,
      location: null,
      travelBufferMinutes: null,
      category: "birthday",
      personId: person.id,
      personName: person.name,
      relationLabel: person.relationLabel,
      isImportant: true,
      href: `/people/${encodeURIComponent(person.id)}`,
      daysUntil: daysUntil(date, now),
    }];
  });

  const regularEvents = storedEvents.flatMap((event): HomeEvent[] => {
    if (isStoredBirthdayDuplicate(event, birthdayEvents, peopleById)) return [];
    const date = localDate(event.date);
    if (!date) return [];
    const remaining = daysUntil(date, now);
    if (remaining < 0) return [];
    const category = event.category?.trim().toLowerCase() || null;
    return [{
      id: event.id,
      source: "event",
      title: event.title,
      date: toDateOnly(date),
      timeOfDay: event.timeOfDay ?? null,
      durationMinutes: event.durationMinutes ?? null,
      location: event.location ?? null,
      travelBufferMinutes: event.travelBufferMinutes ?? null,
      category,
      personId: event.personId ?? null,
      personName: event.personId ? peopleById.get(event.personId)?.name ?? null : null,
      relationLabel: event.personId ? peopleById.get(event.personId)?.relationLabel ?? null : null,
      isImportant: category ? IMPORTANT_CATEGORIES.has(category) : false,
      href: "/dashboard",
      daysUntil: remaining,
    }];
  });

  return [...regularEvents, ...birthdayEvents].sort((first, second) =>
    first.daysUntil - second.daysUntil
    || (first.timeOfDay ?? "99:99").localeCompare(second.timeOfDay ?? "99:99")
    || first.title.localeCompare(second.title),
  );
}

function selectFeatured(events: HomeEvent[]): HomeEvent | null {
  const inSevenDays = events.filter((event) => event.isImportant && event.daysUntil <= 7);
  if (inSevenDays.length) return inSevenDays[0];
  const important = events.filter((event) => event.isImportant);
  return important[0] ?? events[0] ?? null;
}

export function resolveHomeUserName(data: HomeRepositoryData): string | null {
  const emailName = data.email?.split("@")[0] ?? null;
  for (const candidate of [data.profile?.fullName, data.authMetadataName, emailName]) {
    const normalized = candidate?.replace(/\s+/g, " ").trim();
    if (normalized) return normalized.split(" ")[0] ?? normalized;
  }
  return null;
}

function formatCountdown(t: HomeTranslate, value: number): string {
  if (value === 0) return t("countdown.today");
  if (value === 1) return t("countdown.tomorrow");
  return t("countdown.days", { count: value });
}

function formatDate(locale: AppLocale, value: string, options: Intl.DateTimeFormatOptions): string {
  const date = localDate(value);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : value;
}

function personMemories(memories: HomeMemory[], personId: string): HomeMemory[] {
  return memories.filter((memory) => memory.isActive && memory.personId === personId);
}

function memoryValue(memory: HomeMemory): string | null {
  const value = memory.value ?? memory.title;
  return value?.replace(/\s+/g, " ").trim() || null;
}

function classifyMemories(memories: HomeMemory[]) {
  const gifts: HomeMemory[] = [];
  const notes: HomeMemory[] = [];
  const remembered: HomeMemory[] = [];
  const preferences: string[] = [];

  for (const memory of memories) {
    if (!memory.isActive) continue;
    if (memory.category === "gift") {
      if (memoryValue(memory)) gifts.push(memory);
    } else if (memory.category === "memory") {
      remembered.push(memory);
    } else if (memory.category === "preference") {
      const value = memoryValue(memory);
      if (value && !preferences.includes(value)) preferences.push(value);
    } else if (memory.category === "note") {
      notes.push(memory);
    }
  }
  return { gifts, notes, memories: remembered, preferences };
}

function birthdayAgeOnEvent(event: HomeEvent, people: HomePerson[]): number | null {
  if (event.source !== "birthday" || !event.personId) return null;
  const birthday = people.find((person) => person.id === event.personId)?.birthday ?? null;
  const birthYear = birthday && /^(\d{4})-\d{2}-\d{2}$/.exec(birthday)?.[1];
  const eventYear = /^(\d{4})-\d{2}-\d{2}$/.exec(event.date)?.[1];
  if (!birthYear || !eventYear) return null;
  const age = Number(eventYear) - Number(birthYear);
  // Reject malformed/future years and implausible values instead of exposing a false age.
  return Number.isInteger(age) && age >= 0 && age <= 130 ? age : null;
}

function buildFeatured(event: HomeEvent | null, people: HomePerson[], memories: HomeMemory[], locale: AppLocale, t: HomeTranslate): HomeFeaturedEvent | null {
  if (!event) return null;
  const classified = event.personId
    ? classifyMemories(personMemories(memories, event.personId))
    : { gifts: [], notes: [], memories: [], preferences: [] };
  const metrics = [
    classified.gifts.length ? { id: "gifts" as const, icon: "🎁", label: t("metrics.savedGifts", { count: classified.gifts.length }), count: classified.gifts.length, href: event.href } : null,
    classified.notes.length ? { id: "notes" as const, icon: "📝", label: t("metrics.notes", { count: classified.notes.length }), count: classified.notes.length, href: "/notes" } : null,
    classified.memories.length ? { id: "memories" as const, icon: "🖼️", label: t("metrics.memories", { count: classified.memories.length }), count: classified.memories.length, href: event.href } : null,
  ].filter((metric): metric is NonNullable<typeof metric> => Boolean(metric));

  return {
    ...event,
    label: event.isImportant ? t("featured.importantLabel") : t("featured.nextLabel"),
    title: event.source === "birthday" ? t("events.birthdayTitle", { name: event.title }) : event.title,
    dateLabel: formatDate(locale, event.date, { weekday: "long", day: "numeric", month: "long" }),
    countdownLabel: formatCountdown(t, event.daysUntil),
    preferences: classified.preferences.slice(0, 2),
    metrics,
    ctaLabel: event.source === "birthday" ? t("featured.personCta") : t("featured.eventCta"),
    birthdayAge: birthdayAgeOnEvent(event, people),
  };
}

function categoryLabel(event: HomeEvent, t: HomeTranslate): string | null {
  if (event.source === "birthday") return t("categories.birthday");
  if (!event.category) return null;
  const supported: Record<string, string> = {
    birthday: t("categories.birthday"),
    anniversary: t("categories.anniversary"),
    work: t("categories.work"),
    personal: t("categories.personal"),
  };
  return supported[event.category] ?? t("categories.other");
}

function buildUpcoming(events: HomeEvent[], locale: AppLocale, t: HomeTranslate): HomeUpcomingEvent[] {
  return events.slice(0, 3).map((event) => ({
    ...event,
    title: event.source === "birthday" ? t("events.birthdayTitle", { name: event.title }) : event.title,
    dayLabel: formatDate(locale, event.date, { day: "2-digit" }),
    monthLabel: formatDate(locale, event.date, { month: "short" }).replace(".", "").toUpperCase(),
    dateLabel: formatDate(locale, event.date, { weekday: "long", day: "numeric", month: "long" }),
    countdownLabel: formatCountdown(t, event.daysUntil),
    categoryLabel: categoryLabel(event, t),
  }));
}

function buildRecommendations(
  featured: HomeEvent | null,
  data: HomeRepositoryData,
  knowledgeReview: HomeKnowledgeReview | null,
  t: HomeTranslate,
): HomeRecommendation[] {
  const recommendations: HomeRecommendation[] = [];
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const pendingOutcome = (data.pendingGiftOutcomes ?? []).find((gift) => peopleById.has(gift.personId));
  if (pendingOutcome) {
    const person = peopleById.get(pendingOutcome.personId)!;
    recommendations.push({
      id: `gift-outcome-${pendingOutcome.id}`,
      icon: "💝",
      title: t("recommendations.giftOutcomeTitle", { name: person.name }),
      description: t("recommendations.giftOutcomeDescription", { gift: pendingOutcome.title }),
      href: `/people/${encodeURIComponent(person.id)}#gift-workspace`,
      giftFollowUp: { giftId: pendingOutcome.id },
    });
  }
  if (knowledgeReview) {
    recommendations.push({
      id: `knowledge-review-${knowledgeReview.knowledgeId}`,
      icon: "🧠",
      title: t("recommendations.knowledgeReviewTitle", { name: knowledgeReview.personName }),
      description: t("recommendations.knowledgeReviewDescription", { value: knowledgeReview.value }),
      href: knowledgeReview.href,
      knowledgeReview: { knowledgeId: knowledgeReview.knowledgeId },
    });
  }
  if (!featured?.personId) return recommendations;
  const classified = classifyMemories(personMemories(data.memories, featured.personId));
  const personHref = `/people/${encodeURIComponent(featured.personId)}`;

  if (featured.daysUntil <= 30 && classified.gifts.length > 0) {
    recommendations.push({ id: `saved-gifts-${featured.id}`, icon: "🎁", title: t("recommendations.reviewGiftsTitle"), description: t("recommendations.reviewGiftsDescription", { count: classified.gifts.length }), href: personHref });
  } else if (featured.daysUntil <= 30) {
    recommendations.push({ id: `add-gift-${featured.id}`, icon: "💡", title: t("recommendations.addGiftTitle"), description: t("recommendations.addGiftDescription", { name: featured.personName ?? "" }), href: personHref });
  }

  if (classified.preferences.length === 0 && featured.daysUntil <= 14) {
    recommendations.push({ id: `context-${featured.id}`, icon: "✨", title: t("recommendations.addContextTitle"), description: t("recommendations.addContextDescription", { name: featured.personName ?? "" }), href: personHref });
  }
  if (classified.memories.length > 0) {
    recommendations.push({ id: `memories-${featured.id}`, icon: "💜", title: t("recommendations.memoriesTitle"), description: t("recommendations.memoriesDescription", { count: classified.memories.length }), href: personHref });
  }
  return recommendations.slice(0, 3);
}

function normalizedConflictValue(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function selectDueKnowledgeReview(data: HomeRepositoryData, now: Date): HomeKnowledgeReview | null {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return null;
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const conflictGroups = new Map<string, HomeMemory[]>();
  for (const memory of data.memories) {
    if (!memory.personId || memory.category !== "preference" || !memory.userConfirmed || !memory.value) continue;
    if (!["likes", "prefers", "dislikes", "avoids"].includes(memory.polarity ?? "")) continue;
    const key = `${memory.personId}:${normalizedConflictValue(memory.value)}`;
    const group = conflictGroups.get(key) ?? [];
    group.push(memory);
    conflictGroups.set(key, group);
  }
  const conflictedIds = new Set<string>();
  for (const group of conflictGroups.values()) {
    const positive = group.some((item) => item.polarity === "likes" || item.polarity === "prefers");
    const negative = group.some((item) => item.polarity === "dislikes" || item.polarity === "avoids");
    if (positive && negative) group.forEach((item) => conflictedIds.add(item.id));
  }
  const dueBefore = nowMs - 180 * 86_400_000;
  const candidates = data.memories.flatMap((memory) => {
    if (!memory.isActive || !memory.personId || !memory.userConfirmed || !memory.value || conflictedIds.has(memory.id)) return [];
    const person = peopleById.get(memory.personId);
    const baseline = new Date(memory.reviewedAt ?? memory.confirmedAt ?? "").getTime();
    const snoozedUntil = new Date(memory.snoozedUntil ?? "").getTime();
    if (!person || !Number.isFinite(baseline) || baseline > dueBefore || (Number.isFinite(snoozedUntil) && snoozedUntil > nowMs)) return [];
    return [{ memory, person, baseline }];
  }).sort((a, b) => a.baseline - b.baseline || a.memory.id.localeCompare(b.memory.id));
  const candidate = candidates[0];
  return candidate ? {
    knowledgeId: candidate.memory.id,
    personId: candidate.person.id,
    personName: candidate.person.name,
    value: candidate.memory.value!,
    lastConfirmedAt: new Date(candidate.baseline).toISOString(),
    href: `/people/${encodeURIComponent(candidate.person.id)}#knowledge-review`,
  } : null;
}

function hasHigherPriorityCareQuestion(featured: HomeEvent | null, memories: HomeMemory[]): boolean {
  if (!featured?.personId || !featured.isImportant) return false;
  const classified = classifyMemories(personMemories(memories, featured.personId));
  return (featured.daysUntil <= 14 && classified.gifts.length === 0)
    || (featured.daysUntil > 14 && featured.daysUntil <= 30 && classified.preferences.length === 0);
}

export function buildHomeViewModel(data: HomeRepositoryData, locale: AppLocale, t: HomeTranslate, now = new Date()): HomeViewModel {
  const name = resolveHomeUserName(data);
  const events = normalizeEvents(data.people, data.events, now);
  const featured = selectFeatured(events);
  const featuredCard = buildFeatured(featured, data.people, data.memories, locale, t);
  const pendingGiftOutcome = (data.pendingGiftOutcomes ?? []).flatMap((gift) => {
    const person = data.people.find((item) => item.id === gift.personId);
    return person ? [{ id: gift.id, title: gift.title, personName: person.name }] : [];
  })[0] ?? null;
  const dueKnowledgeReview = selectDueKnowledgeReview(data, now);
  const eligibleKnowledgeReview = pendingGiftOutcome || hasHigherPriorityCareQuestion(featured, data.memories)
    ? null
    : dueKnowledgeReview;
  const reviewPreferences = data.knowledgeReviewPreferences ?? { homeEnabled: true, voiceEnabled: true };
  const homeKnowledgeReview = reviewPreferences.homeEnabled ? eligibleKnowledgeReview : null;
  const voiceKnowledgeReview = reviewPreferences.voiceEnabled ? eligibleKnowledgeReview : null;
  const recommendations = buildRecommendations(featured, data, homeKnowledgeReview, t);
  const insights = [];
  if (featured) {
    insights.push({ id: `event-${featured.id}`, icon: featured.source === "birthday" ? "🎂" : "📅", title: featured.source === "birthday" ? t("insights.birthday", { name: featured.personName ?? featured.title, countdown: formatCountdown(t, featured.daysUntil) }) : t("insights.event", { title: featured.title, countdown: formatCountdown(t, featured.daysUntil) }) });
  }
  if (featured?.personId) {
    const classified = classifyMemories(personMemories(data.memories, featured.personId));
    if (classified.gifts.length) insights.push({ id: `gift-${featured.id}`, icon: "🎁", title: t("insights.savedGifts", { count: classified.gifts.length }) });
    if (classified.preferences.length) insights.push({ id: `preferences-${featured.id}`, icon: "✨", title: t("insights.hasPreferences", { name: featured.personName ?? "" }), description: classified.preferences.slice(0, 2).join(" · ") });
  }

  const todayInsights = insights.slice(0, 3);
  const importantCount = todayInsights.length;
  const briefing = buildDailyBriefing({
    name,
    events,
    featured,
    memories: data.memories,
    pendingGiftOutcome,
    knowledgeReview: voiceKnowledgeReview,
    formatCountdown: (value) => formatCountdown(t, value),
    eventTitle: (event) => event.source === "birthday"
      ? t("events.birthdayTitle", { name: event.personName ?? event.title })
      : event.title,
    t,
  });

  return {
    locale,
    isAuthenticated: data.isAuthenticated,
    greeting: { name, title: name ? t("greeting.named", { name }) : t("greeting.fallback"), subtitle: t("greeting.subtitle") },
    todayInsights,
    stats: { importantCount },
    assistantActions: { briefText: briefing.text, briefing },
    featuredEvent: featuredCard,
    upcomingEvents: buildUpcoming(events, locale, t),
    recommendations,
    isEmpty: data.people.length === 0 && data.events.length === 0 && data.memories.length === 0 && (data.pendingGiftOutcomes ?? []).length === 0,
    errors: data.errors,
  };
}
