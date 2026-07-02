import { Insight } from "./types";

/**
 * Selects and orders insights for the Care Feed.
 * For now, insights are sorted only by priority.
 * Additional selection rules will be added here in the future.
 */
export function selectInsights(insights: Insight[]): Insight[] {
  const selectedInsights = [...insights];

  // Higher priority insights appear first
  selectedInsights.sort((a, b) => b.priority - a.priority);

  return selectedInsights;
}