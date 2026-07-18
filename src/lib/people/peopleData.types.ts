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
  relationLabel: string | null;
  birthday: string | null;
  daysUntilBirthday: number | null;
  tags: string[];
  knowledgeItemCount: number;
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
}

export interface PersonTimelineItemViewModel {
  id: string;
  kind: "memory" | "gift_given";
  title: string;
  date: string;
}

export interface PersonBrainInsightViewModel {
  id: string;
  type: string;
  priority: number;
  title: string;
  description: string | null;
  actionUrl: string | null;
}

export interface PersonProfileViewModel {
  isAuthenticated: boolean;
  found: boolean;
  hero: {
    id: string;
    name: string;
    relationLabel: string | null;
    birthday: string | null;
    daysUntilBirthday: number | null;
  } | null;
  likes: PersonKnowledgeValueViewModel[];
  dislikes: PersonKnowledgeValueViewModel[];
  interests: PersonKnowledgeValueViewModel[];
  giftIdeas: PersonKnowledgeValueViewModel[];
  giftHistory: PersonKnowledgeValueViewModel[];
  importantFacts: PersonKnowledgeValueViewModel[];
  timeline: PersonTimelineItemViewModel[];
  brainInsights: PersonBrainInsightViewModel[];
  health: PersonHealthViewModel | null;
  actions: {
    addMemoryUrl: string | null;
    addGiftIdeaUrl: string | null;
    addImportantInformationUrl: string | null;
    canAskHappy: boolean;
  };
}
