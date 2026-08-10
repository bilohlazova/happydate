"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAvatar } from "@/hooks/useAvatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale } from "@/i18n/config";
import { formatProfileMemberSince } from "@/lib/profile/profilePresentation";
import { updateGiftOutcomeLearningEnabled } from "@/lib/repositories/profile/giftOutcomeLearning.repository";

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE — Account Center
   ─────────────────────────────────────────────────────────
   Avatar upload: Capacitor Camera plugin (stable iOS).
   <input type="file"> removed — WKWebView unsafe.
   All other UI, iOS fixes, Supabase logic: unchanged.
═══════════════════════════════════════════════════════════ */

type SettingRow = { icon: string; label: string; value?: string; href?: string };

/* ─────────────────────────────────────────
   PROFILE HERO
───────────────────────────────────────── */
function ProfileHero({
  avatarUrl, avatarFallback, fullName, email, createdAt,
  points, hasCare, surveyCompleted, avatarLoading, onPickAvatar,
}: {
  avatarUrl: string | null;
  avatarFallback: string;
  fullName: string;
  email: string | null;
  createdAt: string | null;
  points: number;
  hasCare: boolean;
  surveyCompleted: boolean;
  avatarLoading: boolean;
  onPickAvatar: () => void;
}) {
  const translate = useTranslations("profile");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const memberSince = createdAt ? formatProfileMemberSince(createdAt, locale) : null;
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
              {translate("membership.memberSince", { date: memberSince })}
            </p>
          )}
        </div>
      </div>

      <div className="pr-badges">
        <span className="pr-badge pr-badge--points">⭐ {translate("hero.points", { points })}</span>
        {hasCare && <span className="pr-badge pr-badge--care">💛 {translate("hero.care")}</span>}
        {surveyCompleted ? (
          <span className="pr-badge pr-badge--done">✅ {translate("hero.surveyComplete")}</span>
        ) : (
          <Link href="/survey" className="pr-badge pr-badge--cta">{translate("hero.surveyReward")} →</Link>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   CARE CARD
───────────────────────────────────────── */
function CareCard({ hasCare }: { hasCare: boolean }) {
  const translate = useTranslations("profile.care");
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
        <Link href="/care/manage" className="pr-care-active__manage">{translate("manage")} →</Link>
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
        <Link href="/care" className="pr-care-upsell__cta">{translate("tryCare")} →</Link>
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
  const rows: SettingRow[] = [
    { icon: "🔔", label: translate("notifications"), value: translate("enabled"), href: "/settings/notifications" },
    { icon: "⏰", label: translate("reminders"), value: translate("threeDaysBefore"), href: "/settings/reminders" },
    { icon: "✨", label: translate("aiSuggestions"), value: translate("active"), href: "/settings/ai" },
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
            <Link href={row.href ?? "#"} className="pr-row">
              <span className="pr-row__icon">{row.icon}</span>
              <span className="pr-row__label">{row.label}</span>
              <span className="pr-row__value">{row.value}</span>
              <span className="pr-row__arrow" aria-hidden="true">›</span>
            </Link>
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
function SecurityCard() {
  const translate = useTranslations("profile.security");
  const rows: SettingRow[] = [
    { icon: "🔑", label: translate("changePassword"), href: "/settings/password" },
    { icon: "📱", label: translate("activeSessions"), href: "/settings/sessions" },
    { icon: "🔒", label: translate("privacy"), href: "/privacy" },
    { icon: "📦", label: translate("exportData"), href: "/settings/export" },
    { icon: "🗑️", label: translate("deleteAccount"), href: "/settings/delete" },
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
            <Link
              href={row.href ?? "#"}
              className={`pr-row${row.href === "/settings/delete" ? " pr-row--danger" : ""}`}
            >
              <span className="pr-row__icon">{row.icon}</span>
              <span className="pr-row__label">{row.label}</span>
              <span className="pr-row__arrow" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
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

  const [userId,    setUserId]    = useState<string | null>(null);
  const [email,     setEmail]     = useState<string | null>(null);
  const [fullName,  setFullName]  = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const { url: avatarUrl, refresh } = useAvatar(userId);

  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [points,          setPoints]          = useState(0);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [hasCare,         setHasCare]         = useState(false);
  const [outcomeLearningEnabled, setOutcomeLearningEnabled] = useState(true);
  const [outcomeLearningBusy, setOutcomeLearningBusy] = useState(false);

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
      setHasCare(!!sub);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

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
        <p>{translate("subtitle")}</p>
      </header>
      <ProfileHero
        avatarUrl={avatarUrl}
        avatarFallback={avatarFallback}
        fullName={fullName}
        email={email}
        createdAt={createdAt}
        points={points}
        hasCare={hasCare}
        surveyCompleted={surveyCompleted}
        avatarLoading={avatarLoading}
        onPickAvatar={pickAndUpload}
      />

      <CareCard hasCare={hasCare} />

      <PersonalDataCard
        fullName={fullName}
        saving={saving}
        message={message}
        onChange={setFullName}
        onSubmit={save}
      />

      <SettingsCard
        outcomeLearningEnabled={outcomeLearningEnabled}
        outcomeLearningBusy={outcomeLearningBusy}
        onOutcomeLearningChange={changeOutcomeLearning}
      />
      <SecurityCard />
      <LogoutButton onLogout={handleLogout} />
    </main>
  );
}
