export const GIFT_LIFECYCLE = ["idea", "selected", "purchased", "given"] as const;

export type GiftLifecycle = (typeof GIFT_LIFECYCLE)[number];
export type ActiveGiftLifecycle = Exclude<GiftLifecycle, "given">;
export const GIFT_OUTCOME = ["liked", "not_liked", "unsure"] as const;
export type GiftOutcomeValue = (typeof GIFT_OUTCOME)[number];

export interface GiftOutcome {
  value: GiftOutcomeValue;
  note: string | null;
  confirmedAt: string;
  learningEnabled: boolean;
}

export interface GiftSelectionSnapshot {
  sourceLinkId: string | null;
  url: string | null;
  title: string | null;
  priceAmount: number | null;
  currency: string | null;
  decisionNote: string | null;
  finalizedAt: string;
}

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
  sourceKnowledgeId: string | null;
  finalSelection: GiftSelectionSnapshot | null;
  finalOutcome: GiftOutcome | null;
}

export interface SavedGiftLink {
  id: string;
  personId: string;
  eventId: string | null;
  giftId: string | null;
  url: string;
  title: string | null;
  merchant: string | null;
  imageUrl: string | null;
  priceAmount: number | null;
  currency: string | null;
  isPreferred: boolean;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGiftInput {
  personId: string;
  eventId?: string | null;
  title: string;
  lifecycle?: GiftLifecycle;
  occurredOn?: string | null;
}

export interface SaveGiftLinkInput {
  personId: string;
  eventId?: string | null;
  giftId?: string | null;
  url: string;
  title?: string | null;
  merchant?: string | null;
  imageUrl?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
}

export interface GiftItemViewModel {
  id: string;
  lifecycle: GiftLifecycle;
  title: string;
  personId: string | null;
  eventId: string | null;
  date: string | null;
  canChangeLifecycle: boolean;
  finalSelection: GiftSelectionSnapshot | null;
  finalOutcome: GiftOutcome | null;
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

export interface PersonGiftManagementViewModel extends PersonGiftsViewModel {
  savedLinks: SavedGiftLink[];
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
