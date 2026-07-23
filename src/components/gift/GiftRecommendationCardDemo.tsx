"use client";

import type { GiftRecommendationSuggestion } from "@/lib/gift-intelligence";
import { GiftRecommendationCard } from "./GiftRecommendationCard";

const demoSuggestions: GiftRecommendationSuggestion[] = [
  {
    title: "Coffee workshop",
    category: "experience",
    why: "Connects a known coffee preference with an event that suits a shared experience.",
    confidence: "high",
    estimatedPrice: 199,
    currency: "PLN",
    personalizationSignals: ["event", "preference", "memory", "budget"],
    cautions: [],
  },
  {
    title: "Travel photo album",
    category: "travel",
    why: "Uses saved travel memories, but the final price depends on the selected format.",
    confidence: "medium",
    estimatedPrice: null,
    currency: null,
    personalizationSignals: ["interest", "memory", "previous_gift_avoidance"],
    cautions: ["price_uncertain"],
  },
  {
    title: "Book subscription",
    category: "subscription",
    why: "May match known interests, but several current preference signals are still missing.",
    confidence: "low",
    estimatedPrice: 120,
    currency: "PLN",
    personalizationSignals: ["relation", "event", "interest", "season", "age", "gender"],
    cautions: ["limited_context", "verify_availability"],
  },
];

export function GiftRecommendationCardDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {demoSuggestions.map((suggestion) => (
        <GiftRecommendationCard key={suggestion.title} suggestion={suggestion} />
      ))}
    </div>
  );
}
