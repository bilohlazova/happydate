import {
  consumerContent,
  consumerIsActive,
  consumerValue,
} from "./consumerCompatibility.ts";
import type { KnowledgeItem } from "./domain.ts";

export type HomeKnowledgeCategory = "gift" | "note" | "memory" | "preference";

export interface HomeKnowledgeProjection {
  id: string;
  personId: string | null;
  eventId: string | null;
  category: HomeKnowledgeCategory;
  title: string | null;
  value: string | null;
  occurredOn: string | null;
  createdAt: string | null;
  isActive: boolean;
  polarity?: KnowledgeItem["polarity"];
  userConfirmed?: boolean;
  confirmedAt?: string | null;
  reviewedAt?: string | null;
  snoozedUntil?: string | null;
}

function meaningful(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function legacyHomeValue(item: KnowledgeItem): string | null {
  return meaningful(consumerValue(item))
    ?? meaningful(item.title)
    ?? meaningful(consumerContent(item));
}

function homeCategory(item: KnowledgeItem): HomeKnowledgeCategory | null {
  if (item.kind === "journal") return null;
  if (item.kind === "gift") return legacyHomeValue(item) ? "gift" : null;
  if (item.kind === "experience") return "memory";
  if (item.kind === "preference") return "preference";
  if (item.kind === "note") return "note";
  return null;
}

/** Canonical Home projection; React and Home presentation never see KnowledgeItem. */
export function projectKnowledgeForHome(
  items: readonly KnowledgeItem[],
): HomeKnowledgeProjection[] {
  const result: HomeKnowledgeProjection[] = [];
  for (const item of items) {
    if (!consumerIsActive(item) || item.aiEligible === false) continue;
    const category = homeCategory(item);
    if (!category) continue;
    result.push({
      id: item.id,
      personId: item.personId,
      eventId: item.eventId,
      category,
      title: item.title,
      value: legacyHomeValue(item),
      occurredOn: item.occurredOn,
      createdAt: item.createdAt,
      isActive: true,
      ...(item.classification?.userConfirmed === true ? {
        polarity: item.polarity,
        userConfirmed: true,
        confirmedAt: item.classification.classifiedAt ?? item.evidence.capturedAt,
        reviewedAt: item.review?.reviewedAt ?? null,
        snoozedUntil: item.review?.snoozedUntil ?? null,
      } : {}),
    });
  }
  return result;
}
