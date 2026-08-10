import type { HomeEvent, HomeKnowledgeReview, HomeMemory, HomeTranslate } from "./home.types";

export type DailyBriefingSectionKind =
  | "greeting"
  | "today"
  | "upcoming"
  | "person-context"
  | "offer"
  | "care-question"
  | "post-gift-question"
  | "knowledge-review-question";

export type DailyBriefingMode = "short" | "detailed";

export interface DailyBriefingSection {
  id: string;
  kind: DailyBriefingSectionKind;
  text: string;
  sourceIds: string[];
}

export interface DailyBriefing {
  text: string;
  sections: DailyBriefingSection[];
  sourceIds: string[];
}

export function briefingTextForMode(
  briefing: DailyBriefing,
  mode: DailyBriefingMode,
): string {
  const sections = mode === "short"
    ? briefing.sections.filter((section) =>
        section.kind === "greeting" || section.kind === "today" || section.kind === "upcoming"
      )
    : briefing.sections;
  return sections.map((section) => section.text).join(" ");
}

interface BuildDailyBriefingInput {
  name: string | null;
  events: HomeEvent[];
  featured: HomeEvent | null;
  memories: HomeMemory[];
  pendingGiftOutcome: {
    id: string;
    title: string;
    personName: string;
  } | null;
  knowledgeReview: HomeKnowledgeReview | null;
  formatCountdown: (daysUntil: number) => string;
  eventTitle: (event: HomeEvent) => string;
  t: HomeTranslate;
}

function safeSpokenValue(value: string | null | undefined): string | null {
  const normalized = value?.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length <= 140 ? normalized : `${normalized.slice(0, 137).trimEnd()}…`;
}

function memoryValue(memory: HomeMemory): string | null {
  return safeSpokenValue(memory.value ?? memory.title);
}

/**
 * Builds a deterministic, traceable briefing from confirmed Home projections.
 * It never labels a saved gift idea as purchased/given and never reads Journals,
 * inactive records, or knowledge that was excluded from the Home projection.
 */
export function buildDailyBriefing({
  name,
  events,
  featured,
  memories,
  pendingGiftOutcome,
  knowledgeReview,
  formatCountdown,
  eventTitle,
  t,
}: BuildDailyBriefingInput): DailyBriefing {
  const sections: DailyBriefingSection[] = [{
    id: "greeting",
    kind: "greeting",
    text: name ? t("brief.greetingNamed", { name }) : t("brief.greetingFallback"),
    sourceIds: [],
  }];
  const today = events.filter((event) => event.daysUntil === 0).slice(0, 3);
  sections.push({
    id: "today",
    kind: "today",
    text: today.length === 0
      ? t("brief.todayNone")
      : t("brief.todayEvents", {
          count: today.length,
          events: today.map(eventTitle).join(", "),
        }),
    sourceIds: today.map((event) => event.id),
  });

  if (featured && featured.daysUntil > 0) {
    sections.push({
      id: `upcoming-${featured.id}`,
      kind: "upcoming",
      text: t("brief.upcoming", {
        title: eventTitle(featured),
        countdown: formatCountdown(featured.daysUntil),
      }),
      sourceIds: [featured.id],
    });
  }

  if (pendingGiftOutcome) {
    sections.push({
      id: `post-gift-${pendingGiftOutcome.id}`,
      kind: "post-gift-question",
      text: t("brief.postGiftQuestion", {
        name: pendingGiftOutcome.personName,
        gift: safeSpokenValue(pendingGiftOutcome.title) ?? pendingGiftOutcome.title,
      }),
      sourceIds: [pendingGiftOutcome.id],
    });
  }

  let hasCareQuestion = Boolean(pendingGiftOutcome);
  if (featured?.personId) {
    const personMemories = memories.filter(
      (memory) => memory.isActive && memory.personId === featured.personId,
    );
    const savedGift = personMemories.find((memory) => memory.category === "gift" && memoryValue(memory));
    const preference = personMemories.find((memory) => memory.category === "preference" && memoryValue(memory));
    const context = savedGift ?? preference;
    const value = context ? memoryValue(context) : null;
    if (context && value) {
      sections.push({
        id: `context-${context.id}`,
        kind: "person-context",
        text: savedGift
          ? t("brief.savedGiftIdea", { name: featured.personName ?? featured.title, value })
          : t("brief.savedPreference", { name: featured.personName ?? featured.title, value }),
        sourceIds: [context.id, featured.id],
      });
    }

    if (featured.isImportant && featured.daysUntil <= 30 && savedGift) {
      sections.push({
        id: `offer-${featured.id}`,
        kind: "offer",
        text: t("brief.giftOffer", { name: featured.personName ?? featured.title }),
        sourceIds: [featured.id],
      });
    } else if (!pendingGiftOutcome && featured.isImportant && featured.daysUntil <= 14 && !savedGift) {
      sections.push({
        id: `care-gift-${featured.id}`,
        kind: "care-question",
        text: t("brief.giftQuestion", { name: featured.personName ?? featured.title }),
        sourceIds: [featured.id],
      });
      hasCareQuestion = true;
    } else if (
      !pendingGiftOutcome &&
      featured.isImportant &&
      featured.daysUntil <= 30 &&
      featured.daysUntil > 14 &&
      !preference
    ) {
      sections.push({
        id: `care-preference-${featured.id}`,
        kind: "care-question",
        text: t("brief.preferenceQuestion", { name: featured.personName ?? featured.title }),
        sourceIds: [featured.id],
      });
      hasCareQuestion = true;
    }
  }

  if (!hasCareQuestion && knowledgeReview) {
    sections.push({
      id: `knowledge-review-${knowledgeReview.knowledgeId}`,
      kind: "knowledge-review-question",
      text: t("brief.knowledgeReviewQuestion", {
        name: knowledgeReview.personName,
        value: safeSpokenValue(knowledgeReview.value) ?? knowledgeReview.value,
      }),
      sourceIds: [knowledgeReview.knowledgeId],
    });
  }

  const sourceIds = [...new Set(sections.flatMap((section) => section.sourceIds))];
  return {
    text: sections.map((section) => section.text).join(" "),
    sections,
    sourceIds,
  };
}
