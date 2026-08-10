import type { GiftOutcomeValue } from "../gifts/gift.types.ts";
import type { GiftOutcomeCategorySignal, GiftRecommendationCategory } from "./giftIntelligence.types.ts";

export const GIFT_OUTCOME_AI_CONTEXT_LIMIT = 10;

export interface GiftOutcomeAiContextPreviewItem {
  giftTitle: string;
  outcome: GiftOutcomeValue;
  note: string | null;
  category: GiftRecommendationCategory;
  categorySignal: GiftOutcomeCategorySignal;
}

function boundedText(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : null;
}

/** Exact ID-free field projection shared by AI formatting and the user preview. */
export function projectGiftOutcomeAiContext(
  outcomes: readonly GiftOutcomeAiContextPreviewItem[],
): GiftOutcomeAiContextPreviewItem[] {
  return outcomes.slice(0, GIFT_OUTCOME_AI_CONTEXT_LIMIT).flatMap((item) => {
    const giftTitle = boundedText(item.giftTitle, 240);
    if (!giftTitle || !["liked", "not_liked", "unsure"].includes(item.outcome)) return [];
    return [{
      giftTitle,
      outcome: item.outcome,
      note: boundedText(item.note, 500),
      category: item.category,
      categorySignal: item.categorySignal,
    }];
  });
}

export interface GiftOutcomeAiContextExportLabels {
  heading: string;
  generatedAt: (formattedDateTime: string, timeZone: string) => string;
  reaction: string;
  category: string;
  signal: string;
  note: string;
  outcomeValue: (value: GiftOutcomeValue) => string;
  signalValue: (value: GiftOutcomeCategorySignal) => string;
  omittedOutcomes: (omittedCount: number, shownCount: number, limit: number) => string;
}

export interface GiftOutcomeAiContextExportOptions {
  generatedAt: Date;
  locale: string;
  timeZone: string;
  omittedCount?: number;
}

export function formatGiftOutcomeAiContextGeneratedAt(value: Date, locale: string, timeZone: string): string {
  if (!Number.isFinite(value.getTime())) throw new Error("Invalid export timestamp");
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(value);
}

export function formatGiftOutcomeAiContextTime(value: Date, locale: string, timeZone: string): string {
  if (!Number.isFinite(value.getTime())) throw new Error("Invalid export timestamp");
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

/** Local plain-text representation of the already-safe preview projection. */
export function formatGiftOutcomeAiContextExport(
  items: readonly GiftOutcomeAiContextPreviewItem[],
  labels: GiftOutcomeAiContextExportLabels,
  options: GiftOutcomeAiContextExportOptions,
): string {
  const projectedItems = projectGiftOutcomeAiContext(items);
  const sections = projectedItems.map((item, index) => [
    `${index + 1}. ${item.giftTitle}`,
    `${labels.reaction}: ${labels.outcomeValue(item.outcome)}`,
    `${labels.category}: ${item.category}`,
    `${labels.signal}: ${labels.signalValue(item.categorySignal)}`,
    ...(item.note ? [`${labels.note}: ${item.note}`] : []),
  ].join("\n"));
  const omittedCount = Math.max(0, Math.trunc(options.omittedCount ?? 0));
  return [
    labels.heading,
    labels.generatedAt(formatGiftOutcomeAiContextGeneratedAt(options.generatedAt, options.locale, options.timeZone), options.timeZone),
    ...sections,
    ...(omittedCount > 0 ? [labels.omittedOutcomes(omittedCount, projectedItems.length, GIFT_OUTCOME_AI_CONTEXT_LIMIT)] : []),
  ].join("\n\n");
}
