"use client";

import { useTranslations } from "next-intl";
import type { HomeViewModel } from "@/lib/home/home.types";
import UpcomingEventsSection from "./UpcomingEventsSection";
import HappyRecommendationsSection from "./HappyRecommendationsSection";
import HomeErrorState from "./HomeErrorState";
import HomeEmptyState from "./HomeEmptyState";
import WellbeingCheckIn from "./WellbeingCheckIn";
import type { ReminderRecord } from "@/lib/repositories/reminders";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";

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
  onSaveGift: (title: string) => Promise<void>;
}

export default function HomeDashboard({ viewModel, reminder: _reminder, inAppDeliveryCount, reminderBusy: _reminderBusy, reminderError: _reminderError, onRetry, onAskHappy: _onAskHappy, onCompleteReminder: _onCompleteReminder, onSnoozeReminder: _onSnoozeReminder, onUndoReminder: _onUndoReminder, onPickGift, onGiftOutcome, onGiftFollowUp, onSaveGift }: HomeDashboardProps) {
  const t = useTranslations("home");
  return (
    <div className="hd-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-[calc(32px+var(--hd-nav-height)+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-14 md:pt-8">
        <section className="relative w-full max-w-[760px] overflow-hidden rounded-[1.35rem] border border-sky-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
          <WellbeingCheckIn locale={viewModel.locale} userName={viewModel.greeting.name} featuredEvent={viewModel.featuredEvent} onPickGift={onPickGift} onSaveGift={onSaveGift} />
        </section>

        {inAppDeliveryCount > 0 && (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950" role="status">
            {t("reminder.deliveryReady", { count: inAppDeliveryCount })}
          </div>
        )}

        {viewModel.errors.length > 0 && <div className="mt-5"><HomeErrorState title={t("error.title")} description={t("error.description")} retry={t("error.retry")} onRetry={onRetry} /></div>}
        {viewModel.isEmpty ? (
          <HomeEmptyState title={t("empty.title")} description={t("empty.description")} addPerson={t("empty.addPerson")} addEvent={t("empty.addEvent")} />
        ) : (
          <div>
            <UpcomingEventsSection events={viewModel.upcomingEvents} title={t("upcoming.next")} allLabel={t("upcoming.all")} emptyLabel={t("upcoming.emptyDescription")} />
            <HappyRecommendationsSection recommendations={viewModel.recommendations} title={t("recommendations.title")} onGiftOutcome={onGiftOutcome} onGiftFollowUp={onGiftFollowUp} followUpLabels={{ answerLabel: t("recommendations.giftOutcomeAnswerLabel"), liked: t("recommendations.giftOutcomeLiked"), notLiked: t("recommendations.giftOutcomeNotLiked"), unsure: t("recommendations.giftOutcomeUnsure"), snooze: t("recommendations.giftOutcomeSnooze"), dismiss: t("recommendations.giftOutcomeDismiss"), error: t("recommendations.giftOutcomeActionError") }} />
          </div>
        )}
      </div>
    </div>
  );
}
