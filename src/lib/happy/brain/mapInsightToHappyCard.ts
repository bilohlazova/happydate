import type { Insight } from "../../brain/types";
import type { HappyCard, HappyCardPriority } from "../types";

const SUPPORTED_MEMORY_INSIGHT_TYPES = new Set([
  "gift_saved",
  "gift_suggestion_ready",
  "missing_person_context",
  "recent_memory",
]);

export interface HomeInsightSelectionOptions {
  eventDatesById?: ReadonlyMap<string, Date>;
}

function happyPriority(priority: number): HappyCardPriority {
  if (priority >= 799) return "high";
  if (priority > 50) return "medium";
  return "low";
}

function actionLabel(type: Insight["type"]): string | null {
  switch (type) {
    case "gift_saved":
      return "Zobacz pomysł";
    case "gift_suggestion_ready":
      return "Zobacz profil";
    case "missing_person_context":
      return "Dodaj informację";
    case "recent_memory":
      return "Zobacz osobę";
    default:
      return null;
  }
}

/** Convert only supported canonical memory insights into the existing card. */
export function mapInsightToHappyCard(insight: Insight): HappyCard | null {
  const label = actionLabel(insight.type);
  const route = insight.action?.action;

  if (
    !SUPPORTED_MEMORY_INSIGHT_TYPES.has(insight.type) ||
    !label ||
    !route ||
    !route.startsWith("/people/")
  ) {
    return null;
  }

  return {
    id: `insight-${insight.id}`,
    type: insight.type === "recent_memory" ? "memory" : "idea",
    priority: happyPriority(insight.priority),
    icon: insight.icon,
    title: insight.title,
    description: insight.description ?? "",
    actionLabel: label,
    actionRoute: route,
    personId: insight.personId,
    reason: insight.reason,
    sourceInsightId: insight.id,
    sourceMemoryIds: [...(insight.metadata?.sourceMemoryIds ?? [])],
  };
}

function eventTimestamp(
  insight: Insight,
  eventDatesById: ReadonlyMap<string, Date>,
): number {
  if (!insight.eventId) return Number.POSITIVE_INFINITY;
  const timestamp = eventDatesById.get(insight.eventId)?.getTime();
  return timestamp !== undefined && Number.isFinite(timestamp)
    ? timestamp
    : Number.POSITIVE_INFINITY;
}

function memoryTypeRank(type: Insight["type"]): number {
  switch (type) {
    case "gift_saved":
      return 0;
    case "gift_suggestion_ready":
      return 1;
    case "missing_person_context":
      return 2;
    case "recent_memory":
      return 3;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

/** Select one global Home recommendation deterministically. */
export function selectHomeMemoryInsight(
  insights: Insight[],
  { eventDatesById = new Map() }: HomeInsightSelectionOptions = {},
): Insight | null {
  const supported = insights.filter((insight) =>
    SUPPORTED_MEMORY_INSIGHT_TYPES.has(insight.type),
  );

  supported.sort((first, second) => {
    if (first.priority !== second.priority) {
      return second.priority - first.priority;
    }

    const typeDifference =
      memoryTypeRank(first.type) - memoryTypeRank(second.type);
    if (typeDifference !== 0) return typeDifference;

    const eventDifference =
      eventTimestamp(first, eventDatesById) -
      eventTimestamp(second, eventDatesById);
    if (eventDifference !== 0 && !Number.isNaN(eventDifference)) {
      return eventDifference;
    }

    return first.id.localeCompare(second.id);
  });

  return supported[0] ?? null;
}

/**
 * Preserve all current cards when there is no canonical recommendation. When
 * one exists, it becomes the only secondary recommendation.
 */
export function composeHomeCards(
  primaryCards: HappyCard[],
  existingRecommendationCards: HappyCard[],
  memoryRecommendation: HappyCard | null,
): HappyCard[] {
  return memoryRecommendation
    ? [...primaryCards, memoryRecommendation]
    : [...primaryCards, ...existingRecommendationCards];
}

/** Fail closed so recommendation errors never suppress the primary briefing. */
export function safelyBuildHomeRecommendation(
  build: () => HappyCard | null,
  onFailure: () => void = () => undefined,
): HappyCard | null {
  try {
    return build();
  } catch {
    onFailure();
    return null;
  }
}
