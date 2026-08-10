"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import {
  DEFAULT_REMINDER_PREFERENCES,
  REMINDER_INTERVALS,
  getReminderPreferences,
  saveReminderPreferences,
  type ReminderPreferences,
} from "@/lib/repositories/reminders";
import {
  disableNativePush,
  enableNativePush,
  supportsNativePush,
} from "@/lib/notifications/pushRegistration";
import { SettingsPageShell, SettingsSection } from "@/components/ui/SettingsPageShell";

export default function ReminderSettingsPage() {
  const t = useTranslations("profile.reminderSettings");
  const reviewT = useTranslations("profile.knowledgeReviewSettings");
  const locale = useLocale();
  const [value, setValue] = useState<ReminderPreferences>(DEFAULT_REMINDER_PREFERENCES);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [nativePushAvailable, setNativePushAvailable] = useState(false);

  useEffect(() => {
    setNativePushAvailable(supportsNativePush());
    let active = true;
    void getReminderPreferences().then((preferences) => {
      if (active) { setValue(preferences); setStatus("idle"); }
    }).catch(() => active && setStatus("error"));
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      if (nativePushAvailable && value.pushEnabled) {
        await enableNativePush(locale);
        await saveReminderPreferences(value);
      } else {
        await saveReminderPreferences(value);
        if (nativePushAvailable) await disableNativePush();
      }
      setStatus("saved");
    }
    catch { setStatus("error"); }
  }

  return (
    <SettingsPageShell backLabel={t("back")} title={t("title")} description={t("description")} icon={<BellRing size={22} />}>
      <form onSubmit={submit}>
        <SettingsSection>
          <label className="block text-sm font-extrabold text-slate-700">{t("timezone")}
            <input className="hd-input mt-2" value={value.timezone} onChange={(e) => setValue({ ...value, timezone: e.target.value })} placeholder="Europe/Warsaw" />
          </label>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-sm font-extrabold text-slate-700">{t("quietStart")}<input type="time" className="hd-input mt-2" value={value.quietHoursStart} onChange={(e) => setValue({ ...value, quietHoursStart: e.target.value })} /></label>
            <label className="text-sm font-extrabold text-slate-700">{t("quietEnd")}<input type="time" className="hd-input mt-2" value={value.quietHoursEnd} onChange={(e) => setValue({ ...value, quietHoursEnd: e.target.value })} /></label>
          </div>
          <label className="mt-5 block text-sm font-extrabold text-slate-700">{t("repeat")}
            <select className="hd-input mt-2" value={value.repeatIntervalMinutes} onChange={(e) => setValue({ ...value, repeatIntervalMinutes: Number(e.target.value) as ReminderPreferences["repeatIntervalMinutes"] })}>
              {REMINDER_INTERVALS.map((minutes) => <option key={minutes} value={minutes}>{t(`intervals.${minutes}`)}</option>)}
            </select>
          </label>
          <label className="hd-settings-row">{t("inApp")}<input type="checkbox" checked={value.inAppEnabled} onChange={(e) => setValue({ ...value, inAppEnabled: e.target.checked })} /></label>
          {nativePushAvailable ? (
            <>
              <label className="hd-settings-row">{t("push")}<input type="checkbox" checked={value.pushEnabled} onChange={(e) => setValue({ ...value, pushEnabled: e.target.checked })} /></label>
              <p className="mt-2 text-xs text-slate-500">{t("pushPermission")}</p>
            </>
          ) : (
            <p className="mt-3 text-xs text-slate-500">{t("pushNativeOnly")}</p>
          )}
        </SettingsSection>
        <SettingsSection title={reviewT("title")} description={reviewT("description")}>
          <label className="hd-settings-row">{reviewT("home")}<input type="checkbox" checked={value.knowledgeReviewHomeEnabled} onChange={(e) => setValue({ ...value, knowledgeReviewHomeEnabled: e.target.checked })} /></label>
          <label className="hd-settings-row">{reviewT("voice")}<input type="checkbox" checked={value.knowledgeReviewVoiceEnabled} onChange={(e) => setValue({ ...value, knowledgeReviewVoiceEnabled: e.target.checked })} /></label>
        </SettingsSection>
        <button className="hd-button mt-6 min-h-12 w-full bg-sky-600 text-white disabled:opacity-50" disabled={status === "loading" || status === "saving"}>{status === "saving" ? t("saving") : t("save")}</button>
        {status === "saved" && <p className="mt-3 text-sm font-bold text-emerald-700">{t("saved")}</p>}
        {status === "error" && <p className="mt-3 text-sm font-bold text-rose-600">{t("error")}</p>}
      </form>
    </SettingsPageShell>
  );
}
