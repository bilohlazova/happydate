"use client";

import Link from "next/link";
import { Bell, Database, Globe2, LockKeyhole, Shield, Sparkles, User, Mail, KeyRound, PauseCircle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { isSupportedLocale } from "@/i18n/config";
import { settingsAccountLabels, settingsPlanLabels, settingsUi } from "@/i18n/settingsUi";

export default function SettingsPage() {
  const t = useTranslations("profile");
  const localeValue = useLocale();
  const localeKey = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = settingsUi[localeKey];
  const account = settingsAccountLabels[localeKey];
  const groups = [
    [copy.groups[0], [[Bell, copy.rows[0], "/settings/notifications"], [Sparkles, copy.rows[1], "/settings/personalization"], [Shield, settingsPlanLabels[localeKey], "/settings/plan", copy.values.free]]],
    [copy.groups[1], [[User, copy.rows[2], "/profile"], [Mail, copy.rows[3], "/settings/email"], [KeyRound, copy.rows[4], "/settings/password"]]],
    [copy.groups[2], [[Shield, copy.rows[5], "/settings/privacy"], [LockKeyhole, copy.rows[6], "/settings/security"], [LockKeyhole, copy.rows[7], "/settings/sessions"]]],
    [copy.groups[3], [[Database, copy.rows[8], "/settings/data"]]],
    [copy.groups[4], [[Globe2, copy.rows[9], "/settings/app", copy.values.language]]],
  ] as const;
  return <main className="hd-page-shell"><div className="hd-page-shell__container"><section className="hd-page-card"><header className="hd-page-card__header"><div className="hd-page-heading"><span className="hd-page-heading__icon"><LockKeyhole size={22} /></span><div><h1>{t("settings.title")}</h1><p>{t("subtitle")}</p></div></div></header><div className="hd-page-card__body">{groups.map(([title, rows]) => <section key={title} className="mb-4"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{title}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">{rows.map(([Icon, label, href, value]) => <Link key={label} href={href} className="flex min-h-16 items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-0 hover:bg-slate-50"><Icon size={20} className="shrink-0 text-cyan-600" aria-hidden="true" /><span className="flex-1 font-bold text-slate-800">{label}</span>{value && <span className="text-sm text-slate-500">{value}</span>}<span className="text-xl text-slate-400" aria-hidden="true">›</span></Link>)}</div></section>)}<section><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{account.group}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><Link href="/settings/pause-account" className="flex min-h-16 items-center gap-4 border-b border-slate-100 px-5 py-3 hover:bg-slate-50"><PauseCircle size={20} className="text-slate-500" /><span className="flex-1 font-bold text-slate-800"><span className="block">{account.pause}</span><small className="font-medium text-slate-500">{account.pauseDescription}</small></span><span>›</span></Link><Link href="/settings/delete-account" className="flex min-h-16 items-center gap-4 px-5 py-3 text-rose-600 hover:bg-rose-50"><Trash2 size={20} /><span className="flex-1 font-bold"><span className="block">{t("security.deleteAccount")}</span><small className="font-medium text-rose-400">{account.deleteDescription}</small></span><span>›</span></Link></div></section></div></section></div></main>;
}
