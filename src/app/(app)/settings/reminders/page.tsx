"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  DEFAULT_REMINDER_PREFERENCES,
  REMINDER_INTERVALS,
  getReminderPreferences,
  saveReminderPreferences,
  type ReminderPreferences,
} from "@/lib/repositories/reminders";

export default function ReminderSettingsPage() {
  const t = useTranslations("profile.reminderSettings");
  const [value, setValue] = useState<ReminderPreferences>(DEFAULT_REMINDER_PREFERENCES);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let active = true;
    void getReminderPreferences().then((preferences) => {
      if (active) { setValue(preferences); setStatus("idle"); }
    }).catch(() => active && setStatus("error"));
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try { await saveReminderPreferences(value); setStatus("saved"); }
    catch { setStatus("error"); }
  }

  return (
    <main className="hd-screen px-4 pb-28 pt-6 sm:px-6">
      <form onSubmit={submit} className="mx-auto max-w-xl rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-7">
        <Link href="/profile" className="text-sm font-bold text-sky-700">← {t("back")}</Link>
        <h1 className="mt-4 text-2xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("description")}</p>

        <label className="mt-6 block text-sm font-extrabold text-slate-700">{t("timezone")}
          <input className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base" value={value.timezone} onChange={(e) => setValue({ ...value, timezone: e.target.value })} placeholder="Europe/Warsaw" />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm font-extrabold text-slate-700">{t("quietStart")}<input type="time" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3" value={value.quietHoursStart} onChange={(e) => setValue({ ...value, quietHoursStart: e.target.value })} /></label>
          <label className="text-sm font-extrabold text-slate-700">{t("quietEnd")}<input type="time" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3" value={value.quietHoursEnd} onChange={(e) => setValue({ ...value, quietHoursEnd: e.target.value })} /></label>
        </div>
        <label className="mt-5 block text-sm font-extrabold text-slate-700">{t("repeat")}
          <select className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3" value={value.repeatIntervalMinutes} onChange={(e) => setValue({ ...value, repeatIntervalMinutes: Number(e.target.value) as ReminderPreferences["repeatIntervalMinutes"] })}>
            {REMINDER_INTERVALS.map((minutes) => <option key={minutes} value={minutes}>{t(`intervals.${minutes}`)}</option>)}
          </select>
        </label>
        <label className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{t("inApp")}<input type="checkbox" checked={value.inAppEnabled} onChange={(e) => setValue({ ...value, inAppEnabled: e.target.checked })} /></label>
        <p className="mt-3 text-xs text-slate-500">{t("pushLater")}</p>
        <button className="hd-button mt-6 min-h-12 w-full bg-sky-600 text-white disabled:opacity-50" disabled={status === "loading" || status === "saving"}>{status === "saving" ? t("saving") : t("save")}</button>
        {status === "saved" && <p className="mt-3 text-sm font-bold text-emerald-700">{t("saved")}</p>}
        {status === "error" && <p className="mt-3 text-sm font-bold text-rose-600">{t("error")}</p>}
      </form>
    </main>
  );
}
