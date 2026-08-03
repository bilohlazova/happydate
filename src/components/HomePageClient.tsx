"use client";

import HomeDashboard from "@/components/home-dashboard/HomeDashboard";
import HomeSkeleton from "@/components/home-dashboard/HomeSkeleton";
import HomeErrorState from "@/components/home-dashboard/HomeErrorState";
import ChatAssistantModal from "@/components/ChatAssistantModal";
import { loadHome } from "@/lib/home/loadHome";
import { buildHomeViewModel } from "@/lib/home/buildHomeViewModel";
import type { HomeViewModel } from "@/lib/home/home.types";
import { isSupportedLocale } from "@/i18n/config";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ensureHomeReminder } from "@/lib/reminders/homeReminderActions";
import {
  consumeQueuedInAppDeliveries,
  markReminderCompleted,
  postponeReminder,
  undoReminderCompletion,
  type ReminderRecord,
} from "@/lib/repositories/reminders";

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // noop
    }
  },
};

function CookieConsent() {
  const translate = useTranslations("navigation.cookie");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!safeStorage.getItem("happydate_cookie_consent")) {
        setVisible(true);
      }
    });

    return () => cancelAnimationFrame(id);
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="h-32 md:hidden" aria-hidden="true" />
      <div
        className="fixed inset-x-0 bottom-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))] z-50 bg-slate-950/95 px-4 py-3 text-white md:bottom-0"
        role="region"
        aria-label={translate("bannerLabel")}
      >
      <div className="mx-auto flex max-w-[430px] flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] font-medium leading-snug">
          {translate("description")} {" "}
          <Link
            href="/privacy"
            className="text-sky-300 underline"
          >
            {translate("privacyLink")}
          </Link>
          .
        </p>
        <button
          onClick={() => {
            safeStorage.setItem("happydate_cookie_consent", "true");
            setVisible(false);
          }}
          className="hd-button min-h-9 bg-sky-500 px-4 text-[13px] text-white"
        >
          {translate("accept")}
        </button>
      </div>
      </div>
    </>
  );
}

export default function HomePageClient() {
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const homeT = useTranslations("home");
  const [viewModel, setViewModel] = useState<HomeViewModel | null>(null);
  const [fatalError, setFatalError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | null>(null);
  const [reminder, setReminder] = useState<ReminderRecord | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [inAppDeliveryCount, setInAppDeliveryCount] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setFatalError(false);
    setViewModel(null);
    setReminder(null);
    setReminderError(null);
    setInAppDeliveryCount(0);

    void loadHome()
      .then(async (data) => {
        if (cancelled) return;
        const nextViewModel = buildHomeViewModel(
          data,
          locale,
          (key, values) => homeT(key as never, values as never),
        );
        setViewModel(nextViewModel);
        if (!nextViewModel.isAuthenticated || !nextViewModel.featuredEvent) return;
        try {
          const nextReminder = await ensureHomeReminder(nextViewModel.featuredEvent);
          const deliveries = await consumeQueuedInAppDeliveries();
          if (!cancelled) {
            setReminder(nextReminder);
            setInAppDeliveryCount(deliveries.length);
          }
        } catch (error) {
          console.error("[HomePageClient] Reminder initialization failed:", error);
          if (!cancelled) setReminderError("initialization_failed");
        }
      })
      .catch((error) => {
        console.error("[HomePageClient] Home data failed:", error);
        if (!cancelled) setFatalError(true);
      });

    return () => { cancelled = true; };
  }, [homeT, locale, reloadKey]);

  const runReminderAction = useCallback(async (
    action: (id: string) => Promise<ReminderRecord>,
  ) => {
    if (!reminder || reminderBusy) return;
    setReminderBusy(true);
    setReminderError(null);
    try {
      setReminder(await action(reminder.id));
    } catch (error) {
      console.error("[HomePageClient] Reminder action failed:", error);
      setReminderError("action_failed");
    } finally {
      setReminderBusy(false);
    }
  }, [reminder, reminderBusy]);

  const complete = useCallback(() => {
    void runReminderAction((id) => markReminderCompleted(id));
  }, [runReminderAction]);

  const snooze = useCallback(() => {
    const until = new Date(Date.now() + 3 * 60 * 60 * 1_000);
    void runReminderAction((id) => postponeReminder(id, until));
  }, [runReminderAction]);

  const undo = useCallback(() => {
    void runReminderAction((id) => undoReminderCompletion(id));
  }, [runReminderAction]);

  const pickGift = useCallback(() => {
    const name = viewModel?.featuredEvent?.personName;
    if (!name) return;
    setChatInitialPrompt(homeT("reminder.pickGiftPrompt", { name }));
    setChatOpen(true);
  }, [homeT, viewModel?.featuredEvent?.personName]);

  return (
    <>
      {!viewModel && !fatalError && <HomeSkeleton />}
      {fatalError && (
        <div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6">
          <HomeErrorState title={homeT("error.title")} description={homeT("error.description")} retry={homeT("error.retry")} onRetry={reload} />
        </div>
      )}
      {viewModel && <HomeDashboard viewModel={viewModel} reminder={reminder} inAppDeliveryCount={inAppDeliveryCount} reminderBusy={reminderBusy} reminderError={reminderError} onRetry={reload} onAskHappy={() => { setChatInitialPrompt(null); setChatOpen(true); }} onCompleteReminder={complete} onSnoozeReminder={snooze} onUndoReminder={undo} onPickGift={pickGift} />}
      <CookieConsent />
      <ChatAssistantModal open={chatOpen} onClose={() => setChatOpen(false)} initialPrompt={chatInitialPrompt} />
    </>
  );
}
