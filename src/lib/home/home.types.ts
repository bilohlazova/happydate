import type { AppLocale } from "@/i18n/config";
import type { HomeKnowledgeProjection } from "@/lib/knowledge";
import type { Insight, PersonKnowledge } from "@/lib/brain/types";
import type {
  AssistantMemoryGroupContext,
  AssistantPersonContext,
} from "@/lib/assistant/chatContract";
import type { DailyBriefing } from "./buildDailyBriefing";

export type HomeEventSource = "event" | "birthday";

export interface HomeProfile {
  fullName: string | null;
}

export interface HomePerson {
  id: string;
  name: string;
  birthday: string | null;
  relationLabel: string | null;
  relationKey: import("@/lib/repositories/person.types").PersonRelationKey | null;
  gender: "female" | "male" | "other" | "unspecified" | null;
}

export interface HomeStoredEvent {
  id: string;
  title: string;
  date: string;
  category: string | null;
  notes: string | null;
  personId: string | null;
}

export interface HomePendingGiftOutcome {
  id: string;
  personId: string;
  title: string;
  givenAt: string | null;
}

export type HomeMemory = HomeKnowledgeProjection;

export type HomeDataSection = "profile" | "people" | "events" | "memories" | "gifts";

export interface HomeDataError {
  section: HomeDataSection;
  message: string;
}

export interface HomeRepositoryData {
  isAuthenticated: boolean;
  profile: HomeProfile | null;
  authMetadataName: string | null;
  email: string | null;
  people: HomePerson[];
  events: HomeStoredEvent[];
  memories: HomeMemory[];
  pendingGiftOutcomes: HomePendingGiftOutcome[];
  errors: HomeDataError[];
}

/** Canonical loader result. Knowledge stays in the data layer and never reaches React UI. */
export interface HomeLoaderData extends HomeRepositoryData {
  brainInsights: Insight[];
  personKnowledge: PersonKnowledge[];
  assistantPeople: AssistantPersonContext[];
  assistantMemories: AssistantMemoryGroupContext[];
}

export interface HomeEvent {
  id: string;
  source: HomeEventSource;
  title: string;
  date: string;
  category: string | null;
  personId: string | null;
  personName: string | null;
  relationLabel: string | null;
  isImportant: boolean;
  href: string;
  daysUntil: number;
}

export interface HomeInsight {
  id: string;
  icon: string;
  title: string;
  description?: string;
}

export interface HomeEventMetric {
  id: "gifts" | "notes" | "memories";
  icon: string;
  label: string;
  count: number;
  href: string;
}

export interface HomeFeaturedEvent extends HomeEvent {
  label: string;
  dateLabel: string;
  countdownLabel: string;
  preferences: string[];
  metrics: HomeEventMetric[];
  ctaLabel: string;
}

export interface HomeUpcomingEvent extends HomeEvent {
  dayLabel: string;
  monthLabel: string;
  dateLabel: string;
  countdownLabel: string;
  categoryLabel: string | null;
}

export interface HomeRecommendation {
  id: string;
  icon: string;
  title: string;
  description?: string;
  href: string;
  giftFollowUp?: { giftId: string };
}

export interface HomeViewModel {
  locale: AppLocale;
  isAuthenticated: boolean;
  greeting: {
    name: string | null;
    title: string;
    subtitle: string;
  };
  todayInsights: HomeInsight[];
  stats: { importantCount: number };
  assistantActions: { briefText: string; briefing: DailyBriefing };
  featuredEvent: HomeFeaturedEvent | null;
  upcomingEvents: HomeUpcomingEvent[];
  recommendations: HomeRecommendation[];
  isEmpty: boolean;
  errors: HomeDataError[];
}

export type HomeTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
