"use client";

import Link from "next/link";
import { Bell, Database, Globe2, LockKeyhole, Shield, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("profile");
  const groups = [
    [t("settings.title"), [[Bell, t("settings.notifications"), "/settings/reminders"], [Sparkles, t("settings.giftLearning.title"), "/settings/personalization"], [Shield, t("hero.care"), "/settings/plan"]]],
    [t("security.title"), [[Shield, t("security.privacy"), "/privacy"], [LockKeyhole, t("security.activeSessions"), "/settings/sessions"], [Database, t("security.exportData"), "/settings/export"]]],
    [t("settings.language.title"), [[Globe2, t("settings.language.title"), "/settings/app"]]],
  ] as const;
  return <main className="hd-page-shell"><div className="hd-page-shell__container"><section className="hd-page-card"><header className="hd-page-card__header"><div className="hd-page-heading"><span className="hd-page-heading__icon"><LockKeyhole size={22} /></span><div><h1>{t("settings.title")}</h1><p>{t("subtitle")}</p></div></div></header><div className="hd-page-card__body">{groups.map(([title, rows]) => <section key={title} className="mb-6"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{title}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">{rows.map(([Icon, label, href]) => <Link key={label} href={href} className="flex min-h-16 items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-0 hover:bg-slate-50"><Icon size={20} className="shrink-0 text-cyan-600" aria-hidden="true" /><span className="flex-1 font-bold text-slate-800">{label}</span><span className="text-xl text-slate-400" aria-hidden="true">›</span></Link>)}</div></section>)}<section><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{t("security.title")}</h2><Link href="/settings/delete-account" className="flex min-h-16 items-center gap-4 rounded-3xl border border-rose-200 bg-white px-5 py-3 text-rose-600 hover:bg-rose-50"><span className="flex-1 font-bold">{t("security.deleteAccount")}</span><span aria-hidden="true">›</span></Link></section></div></section></div></main>;
}
