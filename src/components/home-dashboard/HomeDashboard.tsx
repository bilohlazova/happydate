"use client";

import { useTranslations } from "next-intl";
import type { HomeViewModel } from "@/lib/home/home.types";
import HomeGreeting from "./HomeGreeting";
import FeaturedEventCard from "./FeaturedEventCard";
import UpcomingEventsSection from "./UpcomingEventsSection";
import HappyRecommendationsSection from "./HappyRecommendationsSection";
import HomeErrorState from "./HomeErrorState";
import HomeEmptyState from "./HomeEmptyState";
import WellbeingCheckIn from "./WellbeingCheckIn";
import type { ReminderRecord } from "@/lib/repositories/reminders";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";
import Link from "next/link";

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

export default function HomeDashboard({ viewModel, reminder, inAppDeliveryCount, reminderBusy, reminderError, onRetry, onAskHappy: _onAskHappy, onCompleteReminder, onSnoozeReminder, onUndoReminder, onPickGift, onGiftOutcome, onGiftFollowUp }: HomeDashboardProps) {
  const t = useTranslations("home");
  return (
    <div className="hd-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1160px] px-4 pb-[calc(32px+var(--hd-nav-height)+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-14 md:pt-8">
        <section className="relative overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_96%_0%,rgba(125,211,252,.28),transparent_32%),linear-gradient(135deg,#ffffff_0%,#eef9fd_100%)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.065)] sm:rounded-[2rem] sm:p-8">
          <HomeGreeting greeting={viewModel.greeting} />
          <WellbeingCheckIn locale={viewModel.locale} userName={viewModel.greeting.name} featuredEvent={viewModel.featuredEvent} />
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
            <section id="upcoming" className="scroll-mt-28 pt-8" aria-labelledby="upcoming-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="upcoming-title" className="text-xl font-bold text-slate-900 sm:text-[1.35rem]">{t("upcoming.title")}</h2>
                <Link href="/dashboard" className="text-sm font-bold text-sky-700 transition hover:text-sky-800">{t("upcoming.all")} →</Link>
              </div>
              {viewModel.featuredEvent ? <FeaturedEventCard event={viewModel.featuredEvent} locale={viewModel.locale} preferencesLabel={t("featured.preferences")} giftContextLabel={t("recommendations.addContextDescription", { name: viewModel.featuredEvent.personName ?? "" })} reminder={reminder} reminderBusy={reminderBusy} reminderError={reminderError} reminderLabels={{ completed: t("reminder.completed"), complete: t("reminder.complete"), snooze: t("reminder.snooze"), snoozed: t("reminder.snoozed"), undo: t("reminder.undo"), pickGift: t("reminder.pickGift"), error: t("reminder.error") }} onCompleteReminder={onCompleteReminder} onSnoozeReminder={onSnoozeReminder} onUndoReminder={onUndoReminder} onPickGift={onPickGift} /> : (
                <div className="rounded-[1.25rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <p className="font-bold text-slate-900">{t("upcoming.emptyTitle")}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t("upcoming.emptyDescription")}</p>
                  <Link href="/dashboard" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700">{t("empty.addEvent")}</Link>
                </div>
              )}
            </section>
            <UpcomingEventsSection events={viewModel.upcomingEvents} title={t("upcoming.next")} allLabel={t("upcoming.all")} />
            <HappyRecommendationsSection recommendations={viewModel.recommendations} title={t("recommendations.title")} onGiftOutcome={onGiftOutcome} onGiftFollowUp={onGiftFollowUp} followUpLabels={{ answerLabel: t("recommendations.giftOutcomeAnswerLabel"), liked: t("recommendations.giftOutcomeLiked"), notLiked: t("recommendations.giftOutcomeNotLiked"), unsure: t("recommendations.giftOutcomeUnsure"), snooze: t("recommendations.giftOutcomeSnooze"), dismiss: t("recommendations.giftOutcomeDismiss"), error: t("recommendations.giftOutcomeActionError") }} />
          </div>
        )}
      </div>
    </div>
  );
}
