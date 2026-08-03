"use client";

import { useTranslations } from "next-intl";
import type { HomeViewModel } from "@/lib/home/home.types";
import HomeGreeting from "./HomeGreeting";
import TodaySummary from "./TodaySummary";
import HomeAssistantActions from "./HomeAssistantActions";
import FeaturedEventCard from "./FeaturedEventCard";
import UpcomingEventsSection from "./UpcomingEventsSection";
import HappyRecommendationsSection from "./HappyRecommendationsSection";
import HomeErrorState from "./HomeErrorState";
import HomeEmptyState from "./HomeEmptyState";
import type { ReminderRecord } from "@/lib/repositories/reminders";

const SPEECH_LOCALES: Record<string, string> = { pl: "pl-PL", uk: "uk-UA", en: "en-US", ru: "ru-RU", de: "de-DE" };

interface HomeDashboardProps {
  viewModel: HomeViewModel;
  reminder: ReminderRecord | null;
  inAppDeliveryCount: number;
  reminderBusy: boolean;
  reminderError: string | null;
  onRetry: () => void;
  onAskHappy: () => void;
  onCompleteReminder: () => void;
  onSnoozeReminder: () => void;
  onUndoReminder: () => void;
  onPickGift: () => void;
}

export default function HomeDashboard({ viewModel, reminder, inAppDeliveryCount, reminderBusy, reminderError, onRetry, onAskHappy, onCompleteReminder, onSnoozeReminder, onUndoReminder, onPickGift }: HomeDashboardProps) {
  const t = useTranslations("home");
  return (
    <div className="hd-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[980px] px-4 pb-[calc(32px+var(--hd-nav-height)+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-10 md:pt-8">
        <HomeGreeting greeting={viewModel.greeting} />
        <TodaySummary insights={viewModel.todayInsights} count={viewModel.stats.importantCount} statsLabel={t("stats.label")} statsDescription={t("stats.description")} emptyLabel={t("summary.empty")} />
        <HomeAssistantActions briefText={viewModel.assistantActions.briefText} locale={SPEECH_LOCALES[viewModel.locale] ?? viewModel.locale} onAsk={onAskHappy} labels={{ ask: t("assistant.ask"), listen: t("assistant.listen"), stop: t("assistant.stop"), read: t("assistant.read"), briefTitle: t("assistant.sectionLabel"), close: t("assistant.close"), speechError: t("assistant.speechError") }} />

        {inAppDeliveryCount > 0 && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950" role="status">
            {t("reminder.deliveryReady", { count: inAppDeliveryCount })}
          </div>
        )}

        {viewModel.errors.length > 0 && <div className="mt-5"><HomeErrorState title={t("error.title")} description={t("error.description")} retry={t("error.retry")} onRetry={onRetry} /></div>}
        {viewModel.isEmpty ? (
          <HomeEmptyState title={t("empty.title")} description={t("empty.description")} addPerson={t("empty.addPerson")} addEvent={t("empty.addEvent")} />
        ) : (
          <>
            {viewModel.featuredEvent && <FeaturedEventCard event={viewModel.featuredEvent} preferencesLabel={t("featured.preferences")} reminder={reminder} reminderBusy={reminderBusy} reminderError={reminderError} reminderLabels={{ completed: t("reminder.completed"), complete: t("reminder.complete"), snooze: t("reminder.snooze"), snoozed: t("reminder.snoozed"), undo: t("reminder.undo"), pickGift: t("reminder.pickGift"), error: t("reminder.error") }} onCompleteReminder={onCompleteReminder} onSnoozeReminder={onSnoozeReminder} onUndoReminder={onUndoReminder} onPickGift={onPickGift} />}
            <UpcomingEventsSection events={viewModel.upcomingEvents} title={t("upcoming.title")} allLabel={t("upcoming.all")} />
            <HappyRecommendationsSection recommendations={viewModel.recommendations} title={t("recommendations.title")} />
          </>
        )}
      </div>
    </div>
  );
}
