"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("profile");
  const rows = [
    ["🔔", t("settings.notifications"), "/settings/reminders"],
    ["⏰", t("settings.reminders"), "/settings/reminders"],
    ["✨", t("settings.aiSuggestions"), null],
    ["🧠", t("settings.giftLearning.title"), null],
    ["🌍", t("settings.language.title"), null],
    ["🔑", t("security.changePassword"), "/auth/reset"],
    ["📱", t("security.activeSessions"), "/settings/sessions"],
    ["🔒", t("security.privacy"), "/privacy"],
    ["📦", t("security.exportData"), "/settings/export"],
  ] as const;
  return <main className="safe-container mx-auto max-w-3xl py-10"><header className="mb-6"><h1 className="text-3xl font-extrabold text-slate-900">{t("settings.title")}</h1><p className="mt-2 text-slate-600">{t("subtitle")}</p></header><section className="pr-card"><ul className="pr-rows">{rows.map(([icon, label, href]) => <li key={label}>{href ? <Link href={href} className="pr-row"><span className="pr-row__icon">{icon}</span><span className="pr-row__label">{label}</span><span className="pr-row__arrow">›</span></Link> : <div className="pr-row pr-row--future"><span className="pr-row__icon">{icon}</span><span className="pr-row__label">{label}</span><span className="pr-row__soon">{t("future.soon")}</span></div>}</li>)}</ul></section><section className="pr-card mt-5"><h2 className="pr-card__title">{t("security.title")}</h2><Link href="/settings/delete-account" className="pr-row pr-row--danger mt-3"><span className="pr-row__icon">🗑️</span><span className="pr-row__label">{t("security.deleteAccount")}</span><span className="pr-row__arrow">›</span></Link></section></main>;
}
