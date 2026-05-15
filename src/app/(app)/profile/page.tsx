"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAvatar } from "@/hooks/useAvatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

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
  return (
    <section className="pr-hero">
      <div className="pr-hero__glow" aria-hidden="true" />
      <div className="pr-hero__glow pr-hero__glow--blue" aria-hidden="true" />

      <div className="pr-hero__inner">
        <div className="pr-avatar-wrap">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Zdjęcie profilowe"
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
            aria-label="Zmień zdjęcie profilowe"
            onClick={onPickAvatar}
            disabled={avatarLoading}
          >
            <span aria-hidden="true">{avatarLoading ? "⏳" : "✏️"}</span>
          </button>
        </div>

        <div className="pr-hero__identity">
          <h1 className="pr-hero__name">{fullName || "Twoje imię"}</h1>
          {email    && <p className="pr-hero__email">{email}</p>}
          {createdAt && (
            <p className="pr-hero__since">
              Z nami od {new Date(createdAt).toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      <div className="pr-badges">
        <span className="pr-badge pr-badge--points">⭐ {points} pkt</span>
        {hasCare && <span className="pr-badge pr-badge--care">💛 Care</span>}
        {surveyCompleted ? (
          <span className="pr-badge pr-badge--done">✅ Ankieta</span>
        ) : (
          <Link href="/survey" className="pr-badge pr-badge--cta">+100 pkt →</Link>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   CARE CARD
───────────────────────────────────────── */
function CareCard({ hasCare }: { hasCare: boolean }) {
  if (hasCare) {
    return (
      <section className="pr-care-active">
        <div className="pr-care-active__glow" aria-hidden="true" />
        <div className="pr-care-active__row">
          <div className="pr-care-active__icon">💛</div>
          <div>
            <p className="pr-care-active__title">HappyDate Care — aktywne</p>
            <p className="pr-care-active__sub">Wszystkie przypomnienia i AI podpowiedzi włączone</p>
          </div>
        </div>
        <Link href="/care/manage" className="pr-care-active__manage">Zarządzaj subskrypcją →</Link>
      </section>
    );
  }
  return (
    <section className="pr-care-upsell">
      <div className="pr-care-upsell__glow" aria-hidden="true" />
      <div className="pr-care-upsell__content">
        <p className="pr-care-upsell__label">HappyDate Care</p>
        <p className="pr-care-upsell__title">Ktoś pamięta za Ciebie 💛</p>
        <ul className="pr-care-upsell__perks">
          <li>✨ Inteligentne przypomnienia</li>
          <li>🎁 Podpowiedzi prezentów AI</li>
          <li>📅 Priorytetowe powiadomienia</li>
        </ul>
        <Link href="/care" className="pr-care-upsell__cta">Wypróbuj od 29 zł/mies →</Link>
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
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">👤</span>
        <p className="pr-card__title">Dane osobowe</p>
      </div>
      <form onSubmit={onSubmit} className="pr-form">
        <div className="pr-field">
          <label className="pr-field__label" htmlFor="pr-name">Imię i nazwisko</label>
          <input
            id="pr-name"
            className="pr-input"
            type="text"
            placeholder="Jak masz na imię?"
            value={fullName}
            onChange={e => onChange(e.target.value)}
            /* font-size: 16px via .pr-input CSS — prevents iOS Safari zoom */
          />
        </div>
        <button className="pr-btn-primary" type="submit" disabled={saving}>
          {saving ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </form>
      {message && <p className="pr-feedback">{message}</p>}
    </section>
  );
}

/* ─────────────────────────────────────────
   SETTINGS CARD
───────────────────────────────────────── */
function SettingsCard() {
  const rows: SettingRow[] = [
    { icon: "🔔", label: "Powiadomienia push",  value: "Włączone",    href: "/settings/notifications" },
    { icon: "⏰", label: "Przypomnienia",        value: "3 dni przed", href: "/settings/reminders" },
    { icon: "✨", label: "Podpowiedzi AI",       value: "Aktywne",     href: "/settings/ai" },
    { icon: "🌍", label: "Język aplikacji",      value: "Polski",      href: "/settings/language" },
  ];
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">⚙️</span>
        <p className="pr-card__title">Preferencje</p>
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
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────
   SECURITY CARD
───────────────────────────────────────── */
function SecurityCard() {
  const rows: SettingRow[] = [
    { icon: "🔑", label: "Zmień hasło",          href: "/settings/password" },
    { icon: "📱", label: "Aktywne sesje",         href: "/settings/sessions" },
    { icon: "🔒", label: "Polityka prywatności",  href: "/privacy" },
    { icon: "📦", label: "Eksportuj dane",        href: "/settings/export" },
    { icon: "🗑️", label: "Usuń konto",           href: "/settings/delete" },
  ];
  return (
    <section className="pr-card">
      <div className="pr-card__header">
        <span className="pr-card__icon">🔐</span>
        <p className="pr-card__title">Bezpieczeństwo i prywatność</p>
      </div>
      <ul className="pr-rows">
        {rows.map(row => (
          <li key={row.label}>
            <Link
              href={row.href ?? "#"}
              className={`pr-row${row.label === "Usuń konto" ? " pr-row--danger" : ""}`}
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
  return (
    <div className="pr-logout">
      <button className="pr-btn-ghost" onClick={onLogout}>🚪 Wyloguj się</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();

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
            setMessage(error ? error.message : "Zdjęcie zaktualizowane ✅");
            refresh(); // re-fetch signed URL via useAvatar
          });
      }
    },
    onError: (msg) => setMessage(msg),
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
        .from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({ id: user.id, full_name: "", avatar_url: null });
      } else {
        setFullName(profile.full_name ?? "");
        setAvatarPath(profile.avatar_url ?? null);
      }

      const [{ data: bal }, { data: survey }, { data: sub }] = await Promise.all([
        supabase.from("points_balance").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_survey").select("is_completed").eq("user_id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      ]);

      setPoints(bal?.balance ?? 0);
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
    setMessage(error ? error.message : "Zapisano ✅");
    refresh();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const avatarFallback = fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";
  const avatarLoading  = avatarState.status === "loading";

  return (
    <main className="safe-container pr-shell">
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

      <SettingsCard />
      <SecurityCard />
      <LogoutButton onLogout={handleLogout} />
    </main>
  );
}