"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAvatar } from "@/hooks/useAvatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale } from "@/i18n/config";
import { formatProfileMemberSince } from "@/lib/profile/profilePresentation";
import { updateGiftOutcomeLearningEnabled } from "@/lib/repositories/profile/giftOutcomeLearning.repository";
import { formatMembershipDuration, memberSinceLabels, profileUi } from "@/i18n/profileUi";
// Social preview copy: «На одній хвилі» is provided by the locale dictionary.

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE — Account Center
   ─────────────────────────────────────────────────────────
   Avatar upload: Capacitor Camera plugin (stable iOS).
   <input type="file"> removed — WKWebView unsafe.
   All other UI, iOS fixes, Supabase logic: unchanged.
═══════════════════════════════════════════════════════════ */

type SettingRow = { icon: string; label: string; value?: string; href?: string; comingSoon?: boolean };

function ProfileSettingRow({ row, soonLabel, danger = false }: { row: SettingRow; soonLabel: string; danger?: boolean }) {
  const content = (
    <>
      <span className="pr-row__icon">{row.icon}</span>
      <span className="pr-row__label">{row.label}</span>
      {row.comingSoon ? <span className="pr-row__soon">{soonLabel}</span> : row.value ? <span className="pr-row__value">{row.value}</span> : null}
      {!row.comingSoon && <span className="pr-row__arrow" aria-hidden="true">›</span>}
    </>
  );

  if (row.href && !row.comingSoon) {
    return <Link href={row.href} className={`pr-row${danger ? " pr-row--danger" : ""}`}>{content}</Link>;
  }

  return <div className={`pr-row pr-row--future${danger ? " pr-row--danger" : ""}`} aria-disabled="true">{content}</div>;
}

/* ─────────────────────────────────────────
   PROFILE HERO
───────────────────────────────────────── */
function ProfileHero({
  avatarUrl, avatarFallback, fullName, email, createdAt,
  surveyCompleted, avatarLoading, onPickAvatar, onEdit,
}: {
  avatarUrl: string | null;
  avatarFallback: string;
  fullName: string;
  email: string | null;
  createdAt: string | null;
  surveyCompleted: boolean;
  avatarLoading: boolean;
  onPickAvatar: () => void;
  onEdit: () => void;
}) {
  const translate = useTranslations("profile");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = profileUi[locale];
  const memberSince = createdAt ? formatProfileMemberSince(createdAt, locale) : null;
  const [now, setNow] = useState<number | null>(null);
  // Membership age is captured once after mount to keep render pure.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(Date.now()), []);
  const membershipDuration = useMemo(() => createdAt && now ? formatMembershipDuration(locale, Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))) : null, [createdAt, locale, now]);
  return (
    <section className="pr-hero">
      <div className="pr-hero__glow" aria-hidden="true" />
      <div className="pr-hero__glow pr-hero__glow--blue" aria-hidden="true" />

      <div className="pr-hero__inner">
        <div className="pr-avatar-wrap">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={translate("avatar.alt")}
              width={84}
              height={84}
              className={`pr-avatar-img${avatarLoading ? " pr-avatar-img--loading" : ""}`}
              unoptimized
            />
          ) : (
            <div className={`pr-avatar-placeholder${avatarLoading ? " pr-avatar-img--loading" : ""}`}>
              {avatarLoading ? "…" : avatarFallback}
            </div>
          )}

          {/*
            REPLACED: <input type="file"> — unreliable in WKWebView / Capacitor iOS.
            This <button> calls Camera.getPhoto() via the useAvatarUpload hook,
            which opens the native iOS action sheet (Camera | Library | Files).
          */}
          <button
            type="button"
            className="pr-avatar-edit"
            aria-label={translate("accessibility.changeAvatar")}
            onClick={onPickAvatar}
            disabled={avatarLoading}
          >
            <span aria-hidden="true">{avatarLoading ? "⏳" : "✏️"}</span>
          </button>
        </div>

        <div className="pr-hero__identity">
          <h2 className="pr-hero__name">{fullName || translate("hero.defaultName")}</h2>
          {email    && <p className="pr-hero__email">{email}</p>}
          {memberSince && (
            <p className="pr-hero__since">
              {memberSinceLabels[locale].replace("{date}", memberSince)}
            </p>
          )}
          {membershipDuration && <p className="text-xs font-bold text-cyan-700">{copy.together.replace("{duration}", membershipDuration)}</p>}
          <button type="button" className="pr-btn-ghost mt-2 min-h-9 px-3 text-xs" onClick={onEdit}>{copy.edit}</button>
        </div>
      </div>

    </section>
  );
}

/* ─────────────────────────────────────────
   CARE CARD
───────────────────────────────────────── */
function CareCard({ hasCare }: { hasCare: boolean }) {
  const translate = useTranslations("profile.care");
  const futureT = useTranslations("profile.future");
  if (hasCare) {
    return (
      <section className="pr-care-active">
        <div className="pr-care-active__glow" aria-hidden="true" />
        <div className="pr-care-active__row">
          <div className="pr-care-active__icon">💛</div>
          <div>
            <p className="pr-care-active__title">{translate("activeTitle")}</p>
            <p className="pr-care-active__sub">{translate("activeDescription")}</p>
          </div>
        </div>
        <span className="pr-care-active__manage" aria-disabled="true">{futureT("soon")}</span>
      </section>
    );
  }
  return (
    <section className="pr-care-upsell">
      <div className="pr-care-upsell__glow" aria-hidden="true" />
      <div className="pr-care-upsell__content">
        <p className="pr-care-upsell__label">HappyDate Care</p>
        <p className="pr-care-upsell__title">{translate("upsellTitle")} 💛</p>
        <ul className="pr-care-upsell__perks">
          <li>✨ {translate("perks.reminders")}</li>
          <li>🎁 {translate("perks.gifts")}</li>
          <li>📅 {translate("perks.notifications")}</li>
        </ul>
        <span className="pr-care-upsell__cta" aria-disabled="true">{futureT("soon")}</span>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   PERSONAL DATA CARD
───────────────────────────────────────── */
function PersonalDataCard({
  fullName, saving, message, onChange, onSubmit,
}: {
  fullName: string; saving: boolean; message: string | null;
  onChange: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
}) {
  const translate = useTranslations("profile.account");
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">👤</span>
        <p className="pr-card__title">{translate("title")}</p>
      </div>
      <form onSubmit={onSubmit} className="pr-form">
        <div className="pr-field">
          <label className="pr-field__label" htmlFor="pr-name">{translate("name")}</label>
          <input
            id="pr-name"
            className="pr-input"
            type="text"
            placeholder={translate("namePlaceholder")}
            value={fullName}
            onChange={e => onChange(e.target.value)}
            /* font-size: 16px via .pr-input CSS — prevents iOS Safari zoom */
          />
        </div>
        <button className="pr-btn-primary" type="submit" disabled={saving}>
          {saving ? translate("saving") : translate("save")}
        </button>
      </form>
      {message && <p className="pr-feedback">{message}</p>}
    </section>
  );
}

/* ─────────────────────────────────────────
   SETTINGS CARD
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SettingsCard({
  outcomeLearningEnabled,
  outcomeLearningBusy,
  onOutcomeLearningChange,
}: {
  outcomeLearningEnabled: boolean;
  outcomeLearningBusy: boolean;
  onOutcomeLearningChange: (enabled: boolean) => void;
}) {
  const translate = useTranslations("profile.settings");
  const futureT = useTranslations("profile.future");
  const rows: SettingRow[] = [
    { icon: "🔔", label: translate("notifications"), href: "/settings/reminders" },
    { icon: "⏰", label: translate("reminders"), value: translate("threeDaysBefore"), href: "/settings/reminders" },
    { icon: "✨", label: translate("aiSuggestions"), comingSoon: true },
  ];
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">⚙️</span>
        <p className="pr-card__title">{translate("title")}</p>
      </div>
      <ul className="pr-rows">
        {rows.map(row => (
          <li key={row.label}>
            <ProfileSettingRow row={row} soonLabel={futureT("soon")} />
          </li>
        ))}
        <li>
          <div className="pr-row">
            <span className="pr-row__icon">🧠</span>
            <span className="pr-row__label">
              {translate("giftLearning.title")}
              <small className="block text-xs font-medium text-slate-500">{translate("giftLearning.description")}</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={outcomeLearningEnabled}
              aria-label={translate("giftLearning.title")}
              disabled={outcomeLearningBusy}
              onClick={() => onOutcomeLearningChange(!outcomeLearningEnabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${outcomeLearningEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${outcomeLearningEnabled ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </li>
        <li>
          <LanguageSwitcher isAuthenticated variant="profile" />
        </li>
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────
   SECURITY CARD
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SecurityCard() {
  const translate = useTranslations("profile.security");
  const futureT = useTranslations("profile.future");
  const rows: SettingRow[] = [
    { icon: "🔑", label: translate("changePassword"), href: "/auth/reset" },
    { icon: "📱", label: translate("activeSessions"), href: "/settings/sessions" },
    { icon: "🔒", label: translate("privacy"), href: "/privacy" },
    { icon: "📦", label: translate("exportData"), href: "/settings/export" },
    { icon: "🗑️", label: translate("deleteAccount"), href: "/settings/delete-account" },
  ];
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">🔐</span>
        <p className="pr-card__title">{translate("title")}</p>
      </div>
      <ul className="pr-rows">
        {rows.map(row => (
          <li key={row.label}>
            <ProfileSettingRow row={row} soonLabel={futureT("soon")} danger={row.label === translate("deleteAccount")} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LogoutButton({ onLogout }: { onLogout: () => void }) {
  const translate = useTranslations("profile.actions");
  return (
    <div className="pr-logout">
      <button className="pr-btn-ghost" onClick={onLogout}>🚪 {translate("logout")}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();
  const translate = useTranslations("profile");
  const localeValue = useLocale();
  const profileLocale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = profileUi[profileLocale];

  const [userId,    setUserId]    = useState<string | null>(null);
  const [email,     setEmail]     = useState<string | null>(null);
  const [fullName,  setFullName]  = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const { url: avatarUrl, refresh } = useAvatar(userId);

  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [points,          setPoints]          = useState(0);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [outcomeLearningEnabled, setOutcomeLearningEnabled] = useState(true);
  const [outcomeLearningBusy, setOutcomeLearningBusy] = useState(false);
  const [counts, setCounts] = useState({ people: 0, dates: 0, memories: 0 });

  /* ── Capacitor Camera upload hook ────────────────────────── */
  const { state: avatarState, pickAndUpload } = useAvatarUpload({
    userId: userId ?? "",
    onSuccess: (filePath) => {
      setAvatarPath(filePath);
      // Auto-save avatar_url immediately — no need to click "Zapisz"
      if (userId) {
        supabase.from("profiles")
          .update({ avatar_url: filePath })
          .eq("id", userId)
          .then(({ error }) => {
            setMessage(error ? translate("errors.avatarSaveFailed") : translate("states.avatarSaved"));
            refresh(); // re-fetch signed URL via useAvatar
          });
      }
    },
    onError: () => setMessage(translate("errors.uploadFailed")),
  });

  /* ── Load profile ─────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      setUserId(user.id);
      setEmail(user.email ?? null);
      setCreatedAt(user.created_at ?? null);

      const { data: profile } = await supabase
        .from("profiles").select("full_name, avatar_url, points").eq("id", user.id).maybeSingle();
      const { data: learningPreference } = await supabase
        .from("profiles").select("gift_outcome_learning_enabled").eq("id", user.id).maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({ id: user.id, full_name: "", avatar_url: null });
      } else {
        setFullName(profile.full_name ?? "");
        setAvatarPath(profile.avatar_url ?? null);
        setPoints(profile.points ?? 0);
      }
      setOutcomeLearningEnabled(learningPreference?.gift_outcome_learning_enabled !== false);

      const [{ data: survey }, { data: sub }] = await Promise.all([
        supabase.from("user_survey").select("is_completed").eq("user_id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);

      setSurveyCompleted(Boolean(survey?.is_completed));
      void sub;
      const [{ count: people }, { count: dates }] = await Promise.all([
        supabase.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setCounts({ people: people ?? 0, dates: dates ?? 0, memories: 0 });
    };
    load();
  }, [router]);

  /* ── Save profile name ───────────────────────────────────── */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true); setMessage(null);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, avatar_url: avatarPath }).eq("id", userId);
    setSaving(false);
    setMessage(error ? translate("errors.saveFailed") : translate("states.saved"));
    refresh();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const changeOutcomeLearning = async (enabled: boolean) => {
    if (outcomeLearningBusy) return;
    const previous = outcomeLearningEnabled;
    setOutcomeLearningEnabled(enabled);
    setOutcomeLearningBusy(true);
    setMessage(null);
    try {
      await updateGiftOutcomeLearningEnabled(enabled);
      setMessage(translate("states.giftLearningSaved"));
    } catch {
      setOutcomeLearningEnabled(previous);
      setMessage(translate("errors.giftLearningSaveFailed"));
    } finally {
      setOutcomeLearningBusy(false);
    }
  };

  const avatarFallback = fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";
  const avatarLoading  = avatarState.status === "loading";

  return (
    <main className="safe-container pr-shell" aria-label={translate("accessibility.pageLabel")}>
      <header className="pr-page-intro">
        <span className="pr-page-intro__eyebrow">HappyDate</span>
        <h1>{translate("title")}</h1>
      </header>
      <ProfileHero
        avatarUrl={avatarUrl}
        avatarFallback={avatarFallback}
        fullName={fullName}
        email={email}
        createdAt={createdAt}
        surveyCompleted={surveyCompleted}
        avatarLoading={avatarLoading}
        onPickAvatar={pickAndUpload}
        onEdit={() => setEditing(true)}
      />

      <section className="pr-card border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="pr-card__icon">✨</span><p className="pr-card__title">{copy.socialTitle}</p><span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-cyan-700">{copy.soon}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-800">{copy.socialLead}</p><p className="mt-1 text-sm leading-6 text-slate-600">{copy.socialDescription}</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-white px-3 py-2 shadow-sm">☕ {copy.coffee}</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">🚶 {copy.walk}</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">💬 {copy.talk}</span></div><p className="mt-3 text-xs font-bold text-slate-500">🔒 {copy.location}</p></section>

      <section className="pr-card"><div className="pr-card__header"><span className="pr-card__icon">⭐</span><p className="pr-card__title">Ваш прогрес</p></div><div className="flex items-center justify-between gap-3"><p className="text-xl font-black text-slate-900">{points} <span className="text-sm font-bold text-slate-500">балів</span></p><Link href="/survey" className="inline-flex min-h-9 items-center rounded-xl bg-cyan-600 px-3 text-xs font-bold text-white">Пройти анкету</Link></div><p className="mt-1 text-sm text-slate-500">+100 балів за коротку анкету</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${(Number(Boolean(avatarUrl)) + Number(Boolean(fullName.trim())) + Number(surveyCompleted)) / 3 * 100}%` }} /></div><p className="mt-2 text-sm text-slate-500">{avatarUrl && fullName.trim() && surveyCompleted ? "Профіль заповнено 🎉" : [!avatarUrl && "Додайте фото", !fullName.trim() && "Вкажіть ім’я", !surveyCompleted && "Пройдіть коротку анкету"].filter(Boolean).join(" · ")}</p></section>

      <section className="pr-card"><div className="pr-card__header"><span className="pr-card__icon">♡</span><p className="pr-card__title">Мій HappyDate</p></div><div className="grid grid-cols-3 gap-2 text-center">{[[counts.people, "Люди", "/people"], [counts.dates, "Важливі дати", "/dashboard"], [counts.memories, "Спогади", "/notes"]].map(([value, label, href]) => <Link href={String(href)} key={String(label)} className="rounded-xl bg-slate-50 p-3 hover:bg-cyan-50"><strong className="block text-xl text-slate-900">{value}</strong><span className="text-xs font-bold text-slate-500">{label}</span></Link>)}</div></section>

      {editing && <div className="fixed inset-0 z-50 grid items-end bg-slate-900/35 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={translate("account.title")}><div className="mx-auto w-full max-w-xl rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-extrabold text-slate-900">{translate("account.title")}</h2><button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100" onClick={() => setEditing(false)} aria-label="Close">✕</button></div><PersonalDataCard fullName={fullName} saving={saving} message={message} onChange={setFullName} onSubmit={async (event) => { await save(event); setEditing(false); }} /></div></div>}

    </main>
  );
}
