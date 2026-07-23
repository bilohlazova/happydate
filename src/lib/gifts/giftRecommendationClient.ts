import type {
  GiftRecommendationCaution,
  GiftRecommendationSuggestion,
} from "../gift-intelligence";
import type { GiftDiscoveryPromptInput } from "../gift-discovery/index.ts";
import type { GiftDiscoveryAnswers } from "../gift-discovery/index.ts";

export interface LegacyGiftIdea {
  title?: unknown;
  explanation?: unknown;
  why?: unknown;
  price_range?: unknown;
}

export interface GiftSuggestionApiResponse {
  suggestions?: unknown;
  followUpQuestions?: unknown;
  discovery?: unknown;
  ideas?: unknown;
  error?: unknown;
  cached?: unknown;
}

export interface RequestGiftRecommendationsInput {
  personId: string;
  occasion: string;
  locale: string;
  budget?: {
    amount: number | null;
    currency: string | null;
  };
  event?: {
    id: string | null;
    category: string | null;
    date: string | null;
    personId: string | null;
  };
  discoveryAnswers?: GiftDiscoveryAnswers;
  skippedDiscoveryQuestions?: string[];
  signal?: AbortSignal;
}

export type GiftRecommendationsResult =
  | {
      ok: true;
      suggestions: GiftRecommendationSuggestion[];
      followUpQuestions: string[];
      discovery: GiftDiscoveryPromptInput | null;
      usedLegacyFallback: boolean;
      cached: boolean;
    }
  | {
      ok: false;
      error: "unauthorized" | "person_not_found" | "request_failed";
    };

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function isStructuredSuggestion(value: unknown): value is GiftRecommendationSuggestion {
  if (!value || typeof value !== "object") return false;
  const suggestion = value as Record<string, unknown>;
  return (
    typeof suggestion.title === "string" &&
    typeof suggestion.category === "string" &&
    typeof suggestion.why === "string" &&
    typeof suggestion.confidence === "string" &&
    Array.isArray(suggestion.personalizationSignals) &&
    Array.isArray(suggestion.cautions) &&
    ("estimatedPrice" in suggestion) &&
    ("currency" in suggestion)
  );
}

function followUpQuestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter((item): item is string => Boolean(item));
}

function isDiscoveryPromptInput(value: unknown): value is GiftDiscoveryPromptInput {
  if (!value || typeof value !== "object") return false;
  const discovery = value as Record<string, unknown>;
  return (
    typeof discovery.completionScore === "number" &&
    Array.isArray(discovery.remainingQuestions) &&
    Array.isArray(discovery.answeredQuestions) &&
    Array.isArray(discovery.missingSignals) &&
    typeof discovery.locale === "string"
  );
}

function discovery(value: unknown): GiftDiscoveryPromptInput | null {
  return isDiscoveryPromptInput(value) ? value : null;
}

export function mapLegacyIdeaToStructuredSuggestion(
  idea: LegacyGiftIdea,
): GiftRecommendationSuggestion | null {
  const title = text(idea.title);
  const why = text(idea.why) ?? text(idea.explanation);
  if (!title || !why) return null;

  const cautions: GiftRecommendationCaution[] = ["legacy_fallback", "limited_context"];
  return {
    title,
    category: "other",
    why,
    confidence: "low",
    estimatedPrice: null,
    currency: null,
    personalizationSignals: [],
    cautions,
  };
}

export function normalizeGiftSuggestionResponse(
  response: GiftSuggestionApiResponse,
): Omit<Extract<GiftRecommendationsResult, { ok: true }>, "cached"> {
  if (Array.isArray(response.suggestions)) {
    return {
      ok: true,
      suggestions: response.suggestions.filter(isStructuredSuggestion),
      followUpQuestions: followUpQuestions(response.followUpQuestions),
      discovery: discovery(response.discovery),
      usedLegacyFallback: false,
    };
  }

  if (Array.isArray(response.ideas)) {
    return {
      ok: true,
      suggestions: response.ideas
        .map((idea) => mapLegacyIdeaToStructuredSuggestion(idea as LegacyGiftIdea))
        .filter((item): item is GiftRecommendationSuggestion => Boolean(item)),
      followUpQuestions: followUpQuestions(response.followUpQuestions),
      discovery: discovery(response.discovery),
      usedLegacyFallback: true,
    };
  }

  return {
    ok: true,
    suggestions: [],
    followUpQuestions: followUpQuestions(response.followUpQuestions),
    discovery: discovery(response.discovery),
    usedLegacyFallback: false,
  };
}

export async function requestGiftRecommendations(
  input: RequestGiftRecommendationsInput,
): Promise<GiftRecommendationsResult> {
  const { supabase } = await import("../supabaseClient.ts");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "unauthorized" };

  const response = await fetch("/api/ai/gift-suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      personId: input.personId,
      occasion: input.occasion,
      locale: input.locale,
      budget: input.budget,
      event: input.event,
      discoveryAnswers: input.discoveryAnswers,
      skippedDiscoveryQuestions: input.skippedDiscoveryQuestions,
    }),
    cache: "no-store",
    signal: input.signal,
  });

  const payload = await response.json().catch(() => ({})) as GiftSuggestionApiResponse;
  if (!response.ok) {
    const error = payload.error === "unauthorized" || payload.error === "person_not_found"
      ? payload.error
      : "request_failed";
    return { ok: false, error };
  }

  return {
    ...normalizeGiftSuggestionResponse(payload),
    cached: payload.cached === true,
  };
}
