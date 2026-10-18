"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Database, Globe2, KeyRound, LockKeyhole, Shield, Sparkles, Trash2, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";
import { isSupportedLocale } from "@/i18n/config";
import { settingsUi } from "@/i18n/settingsUi";
import { loadGiftOutcomeLearningEnabled, updateGiftOutcomeLearningEnabled } from "@/lib/repositories/profile/giftOutcomeLearning.repository";
import { supabase } from "@/lib/supabaseClient";

const SETTINGS_COPY = {
  uk: { intro: "Сповіщення, приватність, персоналізація та дані — окремо від вашого профілю.", push: "Push-сповіщення", reminders: "Нагадування", care: "Персональна турбота й check-in-и", giftLearning: "Навчання на реакціях на подарунки", enabled: "Увімкнено", disabled: "Вимкнено", saved: "Налаштування збережено", error: "Не вдалося зберегти налаштування.", privacy: "Політика конфіденційності", export: "Експортувати дані", language: "Мова застосунку" },
  pl: { intro: "Powiadomienia, prywatność, personalizacja i dane — oddzielnie od profilu.", push: "Powiadomienia push", reminders: "Przypomnienia", care: "Osobista troska i check-iny", giftLearning: "Uczenie się z reakcji na prezenty", enabled: "Włączone", disabled: "Wyłączone", saved: "Ustawienie zapisane", error: "Nie udało się zapisać ustawienia.", privacy: "Polityka prywatności", export: "Eksportuj dane", language: "Język aplikacji" },
  en: { intro: "Notifications, privacy, personalization, and data — separate from your profile.", push: "Push notifications", reminders: "Reminders", care: "Personal care and check-ins", giftLearning: "Learn from gift reactions", enabled: "Enabled", disabled: "Disabled", saved: "Setting saved", error: "The setting could not be saved.", privacy: "Privacy policy", export: "Export data", language: "Application language" },
  de: { intro: "Benachrichtigungen, Datenschutz, Personalisierung und Daten — getrennt von deinem Profil.", push: "Push-Benachrichtigungen", reminders: "Erinnerungen", care: "Persönliche Begleitung und Check-ins", giftLearning: "Aus Geschenkreaktionen lernen", enabled: "Aktiviert", disabled: "Deaktiviert", saved: "Einstellung gespeichert", error: "Die Einstellung konnte nicht gespeichert werden.", privacy: "Datenschutzerklärung", export: "Daten exportieren", language: "Anwendungssprache" },
  ru: { intro: "Уведомления, конфиденциальность, персонализация и данные — отдельно от профиля.", push: "Push-уведомления", reminders: "Напоминания", care: "Персональная забота и check-in-ы", giftLearning: "Обучение на реакциях на подарки", enabled: "Включено", disabled: "Выключено", saved: "Настройка сохранена", error: "Не удалось сохранить настройку.", privacy: "Политика конфиденциальности", export: "Экспортировать данные", language: "Язык приложения" },
} as const;

function SettingsLink({ href, icon: Icon, label, danger = false }: { href: string; icon: typeof Bell; label: string; danger?: boolean }) {
  return <Link href={href} className={`flex min-h-16 items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-0 ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-800 hover:bg-slate-50"}`}><Icon size={20} className={`shrink-0 ${danger ? "text-rose-500" : "text-cyan-600"}`} aria-hidden="true" /><span className="flex-1 font-bold">{label}</span><span className="text-xl text-slate-400" aria-hidden="true">›</span></Link>;
}

function PreferenceSwitch({ label, checked, busy, onChange, enabledLabel, disabledLabel }: { label: string; checked: boolean; busy: boolean; onChange: () => void; enabledLabel: string; disabledLabel: string }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={busy} onClick={onChange} className="flex min-h-16 w-full items-center gap-4 border-b border-slate-100 px-5 py-3 text-left last:border-0 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><Sparkles size={20} className="shrink-0 text-cyan-600" aria-hidden="true" /><span className="flex-1 font-bold text-slate-800">{label}</span><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{busy ? "…" : checked ? enabledLabel : disabledLabel}</span></button>;
}

export default function SettingsPage() {
  const t = useTranslations("profile");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = SETTINGS_COPY[locale];
  const labels = settingsUi[locale];
  const { user } = useAuth();
  const [giftLearning, setGiftLearning] = useState(true);
  const [wellbeingCare, setWellbeingCare] = useState(false);
  const [busy, setBusy] = useState<"gift" | "care" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      loadGiftOutcomeLearningEnabled(user.id),
      supabase.from("profiles").select("wellbeing_personalization_enabled").eq("id", user.id).maybeSingle(),
    ]).then(([giftEnabled, careResult]) => {
      if (!active) return;
      setGiftLearning(giftEnabled);
      setWellbeingCare(careResult.data?.wellbeing_personalization_enabled === true);
    }).catch(() => { if (active) setMessage(copy.error); });
    return () => { active = false; };
  }, [copy.error, user]);

  const changeGiftLearning = async () => {
    if (busy) return;
    const next = !giftLearning;
    setBusy("gift"); setMessage(null);
    try { await updateGiftOutcomeLearningEnabled(next); setGiftLearning(next); setMessage(copy.saved); }
    catch { setMessage(copy.error); }
    finally { setBusy(null); }
  };

  const changeWellbeingCare = async () => {
    if (!user || busy) return;
    const next = !wellbeingCare;
    setBusy("care"); setMessage(null);
    const { error } = await supabase.from("profiles").update({ wellbeing_personalization_enabled: next }).eq("id", user.id);
    if (error) setMessage(copy.error); else { setWellbeingCare(next); setMessage(copy.saved); }
    setBusy(null);
  };

  return <main className="hd-page-shell"><div className="hd-page-shell__container"><section className="hd-page-card"><header className="hd-page-card__header"><div className="hd-page-heading"><span className="hd-page-heading__icon"><LockKeyhole size={22} /></span><div><h1>{t("settings.title")}</h1><p>{copy.intro}</p></div></div></header><div className="hd-page-card__body">
    {message && <p className="mb-4 rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800" role="status">{message}</p>}
    <section className="mb-5"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{labels.groups[0]}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><SettingsLink href="/settings/reminders" icon={Bell} label={copy.push} /><SettingsLink href="/settings/reminders" icon={Bell} label={copy.reminders} /><PreferenceSwitch label={copy.care} checked={wellbeingCare} busy={busy === "care"} onChange={() => void changeWellbeingCare()} enabledLabel={copy.enabled} disabledLabel={copy.disabled} /><PreferenceSwitch label={copy.giftLearning} checked={giftLearning} busy={busy === "gift"} onChange={() => void changeGiftLearning()} enabledLabel={copy.enabled} disabledLabel={copy.disabled} /></div></section>
    <section className="mb-5"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{labels.groups[1]}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><SettingsLink href="/profile" icon={User} label={labels.rows[2]} /><SettingsLink href="/auth/reset" icon={KeyRound} label={t("security.changePassword")} /></div></section>
    <section className="mb-5"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{labels.groups[2]}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><SettingsLink href="/privacy" icon={Shield} label={copy.privacy} /><SettingsLink href="/settings/sessions" icon={LockKeyhole} label={t("security.activeSessions")} /></div></section>
    <section className="mb-5"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{labels.groups[3]}</h2><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><SettingsLink href="/settings/export" icon={Database} label={copy.export} /></div></section>
    <section className="mb-5"><h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">{copy.language}</h2><div className="rounded-3xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><Globe2 size={20} className="text-cyan-600" aria-hidden="true" /><LanguageSwitcher isAuthenticated variant="profile" /></div></div></section>
    <section><div className="overflow-hidden rounded-3xl border border-rose-100 bg-white"><SettingsLink href="/settings/delete-account" icon={Trash2} label={t("security.deleteAccount")} danger /></div></section>
  </div></section></div></main>;
}
