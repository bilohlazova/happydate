import type { AppLocale } from "@/i18n/config";

export type HomeEventSource = "event" | "birthday";

export interface HomeProfile {
  fullName: string | null;
}

export interface HomePerson {
  id: string;
  name: string;
  birthday: string | null;
  relationLabel: string | null;
}

export interface HomeStoredEvent {
  id: string;
  title: string;
  date: string;
  category: string | null;
  notes: string | null;
}

export interface HomeMemory {
  id: string;
  personId: string | null;
  eventId: string | null;
  type: string | null;
  title: string | null;
  value: string | null;
  content: string | null;
  occurredOn: string | null;
  createdAt: string | null;
  isActive: boolean;
}

export type HomeDataSection = "profile" | "people" | "events" | "memories";

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
  errors: HomeDataError[];
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
  assistantActions: { briefText: string };
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
