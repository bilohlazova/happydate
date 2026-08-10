export type PersonHealthArea =
  | "birthday"
  | "preferences"
  | "interests"
  | "giftIdea"
  | "importantFacts"
  | "memories";

export interface PersonHealthViewModel {
  level: "starting" | "partial" | "good";
  missingAreas: Array<{
    id: PersonHealthArea;
    actionUrl: string | null;
  }>;
}

export interface PersonListItemViewModel {
  id: string;
  name: string;
  relationship: string | null;
  relationLabel: string | null;
  relationKey: import("@/lib/repositories/person.types").PersonRelationKey | null;
  relationCategory: import("@/lib/repositories/person.types").PersonRelationCategory | null;
  gender: import("@/lib/repositories/person.types").PersonGender;
  birthday: string | null;
  daysUntilBirthday: number | null;
  createdAt: string;
  tags: string[];
  knowledgeItemCount: number;
  memoriesCount: number;
  searchText: string;
  href: string;
}

export interface PeoplePageViewModel {
  isAuthenticated: boolean;
  people: PersonListItemViewModel[];
  summary: {
    peopleCount: number;
    birthdaysThisWeek: number;
    incompleteProfilesCount: number;
  };
  recommendation: {
    personId: string;
    type: "upcoming_birthday";
    daysUntil: number;
    actionUrl: string;
  } | null;
}

export interface PersonKnowledgeValueViewModel {
  id: string;
  value: string;
  category: string | null;
  sourceKind: string;
  userConfirmed: boolean;
  sourceExcerpt: string | null;
  capturedAt: string | null;
}

export interface PersonTimelineItemViewModel {
  id: string;
  kind: "memory" | "gift_idea" | "gift_selected" | "gift_purchased" | "gift_given";
  title: string;
  date: string;
  giftOutcome?: import("@/lib/gifts/gift.types").GiftOutcomeValue;
  giftOutcomeNote?: string | null;
}

export interface PersonBrainInsightViewModel {
  id: string;
  type: string;
  priority: number;
  title: string;
  description: string | null;
  actionUrl: string | null;
}

export interface ConfirmedGiftOutcomeViewModel {
  giftId: string;
  giftTitle: string;
  outcome: import("@/lib/gifts/gift.types").GiftOutcomeValue;
  note: string | null;
  confirmedAt: string;
  learningEnabled: boolean;
  aiEligible: boolean;
  category: import("@/lib/gift-intelligence/giftIntelligence.types").GiftRecommendationCategory;
  learningSignal: import("@/lib/gift-intelligence/giftIntelligence.types").GiftOutcomeCategorySignal | "history_only";
}

export interface PersonProfileViewModel {
  isAuthenticated: boolean;
  found: boolean;
  hero: {
    id: string;
    name: string;
    relationLabel: string | null;
    relationKey: import("@/lib/repositories/person.types").PersonRelationKey | null;
    gender: import("@/lib/repositories/person.types").PersonGender;
    birthday: string | null;
    daysUntilBirthday: number | null;
  } | null;
  likes: PersonKnowledgeValueViewModel[];
  dislikes: PersonKnowledgeValueViewModel[];
  interests: PersonKnowledgeValueViewModel[];
  giftIdeas: PersonKnowledgeValueViewModel[];
  giftHistory: PersonKnowledgeValueViewModel[];
  importantFacts: PersonKnowledgeValueViewModel[];
  archivedKnowledge: PersonKnowledgeValueViewModel[];
  timeline: PersonTimelineItemViewModel[];
  brainInsights: PersonBrainInsightViewModel[];
  confirmedGiftOutcomes: ConfirmedGiftOutcomeViewModel[];
  giftOutcomeAiPreview: import("@/lib/gift-intelligence/giftOutcomeAiContextPreview").GiftOutcomeAiContextPreviewItem[];
  giftOutcomeLearningEnabled: boolean;
  health: PersonHealthViewModel | null;
  actions: {
    addMemoryUrl: string | null;
    addGiftIdeaUrl: string | null;
    addImportantInformationUrl: string | null;
    canAskHappy: boolean;
  };
}
