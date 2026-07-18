export const GIFT_LIFECYCLE = ["idea", "selected", "purchased", "given"] as const;

export type GiftLifecycle = (typeof GIFT_LIFECYCLE)[number];
export type ActiveGiftLifecycle = Exclude<GiftLifecycle, "given">;

/** Persistence-agnostic Gift Domain record. */
export interface GiftRecord {
  id: string;
  lifecycle: GiftLifecycle;
  personId: string | null;
  eventId: string | null;
  title: string | null;
  value: string;
  occurredOn: string | null;
  createdAt: string | null;
  sourceKnowledgeId: string;
}

export interface GiftItemViewModel {
  id: string;
  lifecycle: GiftLifecycle;
  title: string;
  personId: string | null;
  eventId: string | null;
  date: string | null;
}

export interface GiftCollectionViewModel {
  activeIdeas: GiftItemViewModel[];
  history: GiftItemViewModel[];
  counts: {
    idea: number;
    selected: number;
    purchased: number;
    given: number;
  };
}

export interface PersonGiftsViewModel extends GiftCollectionViewModel {
  personId: string;
}

export interface EventGiftsViewModel extends GiftCollectionViewModel {
  eventId: string;
}

export interface GiftWorkspaceViewModel extends GiftCollectionViewModel {
  isAuthenticated: boolean;
  personIds: string[];
  eventIds: string[];
  recommendationContext: GiftRecommendationContextViewModel;
}

/** Read-only projection reserved for a future AI recommender. */
export interface GiftRecommendationContextViewModel {
  activeIdeas: GiftItemViewModel[];
  confirmedHistory: GiftItemViewModel[];
  personIds: string[];
  eventIds: string[];
}
