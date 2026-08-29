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
import WellbeingCheckIn from "./WellbeingCheckIn";
import type { ReminderRecord } from "@/lib/repositories/reminders";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";

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
  onGiftOutcome: (giftId: string, outcome: GiftOutcomeValue) => Promise<void>;
  onGiftFollowUp: (giftId: string, action: "snooze" | "dismiss") => Promise<void>;
}

export default function HomeDashboard({ viewModel, reminder, inAppDeliveryCount, reminderBusy, reminderError, onRetry, onAskHappy, onCompleteReminder, onSnoozeReminder, onUndoReminder, onPickGift, onGiftOutcome, onGiftFollowUp }: HomeDashboardProps) {
  const t = useTranslations("home");
  return (
    <div className="hd-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1060px] px-4 pb-[calc(32px+var(--hd-nav-height)+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-12 md:pt-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_96%_0%,rgba(125,211,252,.42),transparent_29%),radial-gradient(circle_at_4%_100%,rgba(186,230,253,.24),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f5fbff_100%)] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)] sm:p-7">
          <HomeGreeting greeting={viewModel.greeting} />
          <WellbeingCheckIn locale={viewModel.locale} userName={viewModel.greeting.name} />
          <TodaySummary insights={viewModel.todayInsights} count={viewModel.stats.importantCount} statsLabel={t("stats.label")} statsDescription={t("stats.description")} emptyLabel={t("summary.empty")} />
        </section>

        <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,.055)] sm:p-5">
          <HomeAssistantActions briefing={viewModel.assistantActions.briefing} locale={SPEECH_LOCALES[viewModel.locale] ?? viewModel.locale} onAsk={onAskHappy} labels={{ ask: t("assistant.ask"), listen: t("assistant.listen"), pause: t("assistant.pause"), resume: t("assistant.resume"), stop: t("assistant.stop"), read: t("assistant.read"), progress: t("assistant.progress"), interrupted: t("assistant.interrupted"), modeLabel: t("assistant.modeLabel"), shortMode: t("assistant.shortMode"), detailedMode: t("assistant.detailedMode"), briefTitle: t("assistant.sectionLabel"), close: t("assistant.close"), speechError: t("assistant.speechError") }} />
        </div>

        {inAppDeliveryCount > 0 && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950" role="status">
            {t("reminder.deliveryReady", { count: inAppDeliveryCount })}
          </div>
        )}

        {viewModel.errors.length > 0 && <div className="mt-5"><HomeErrorState title={t("error.title")} description={t("error.description")} retry={t("error.retry")} onRetry={onRetry} /></div>}
        {viewModel.isEmpty ? (
          <HomeEmptyState title={t("empty.title")} description={t("empty.description")} addPerson={t("empty.addPerson")} addEvent={t("empty.addEvent")} />
        ) : (
          <div id="home-plan">
            {viewModel.featuredEvent && <FeaturedEventCard event={viewModel.featuredEvent} locale={viewModel.locale} preferencesLabel={t("featured.preferences")} giftContextLabel={t("recommendations.addContextDescription", { name: viewModel.featuredEvent.personName ?? "" })} reminder={reminder} reminderBusy={reminderBusy} reminderError={reminderError} reminderLabels={{ completed: t("reminder.completed"), complete: t("reminder.complete"), snooze: t("reminder.snooze"), snoozed: t("reminder.snoozed"), undo: t("reminder.undo"), pickGift: t("reminder.pickGift"), error: t("reminder.error") }} onCompleteReminder={onCompleteReminder} onSnoozeReminder={onSnoozeReminder} onUndoReminder={onUndoReminder} onPickGift={onPickGift} />}
            <UpcomingEventsSection events={viewModel.upcomingEvents} title={t("upcoming.title")} allLabel={t("upcoming.all")} />
            <HappyRecommendationsSection recommendations={viewModel.recommendations} title={t("recommendations.title")} onGiftOutcome={onGiftOutcome} onGiftFollowUp={onGiftFollowUp} followUpLabels={{ answerLabel: t("recommendations.giftOutcomeAnswerLabel"), liked: t("recommendations.giftOutcomeLiked"), notLiked: t("recommendations.giftOutcomeNotLiked"), unsure: t("recommendations.giftOutcomeUnsure"), snooze: t("recommendations.giftOutcomeSnooze"), dismiss: t("recommendations.giftOutcomeDismiss"), error: t("recommendations.giftOutcomeActionError") }} />
          </div>
        )}
      </div>
    </div>
  );
}
