"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAvatar } from "@/hooks/useAvatar";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type EventRow = {
  id: string;
  title: string;
  date: string;
  category: string | null;
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function daysLabel(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt    = new Date(dateStr + "T00:00:00");
  const diff  = Math.round((dt.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Dziś 🎉";
  if (diff === 1) return "Jutro";
  if (diff < 0)  return `${Math.abs(diff)} dni temu`;
  return `Za ${diff} dni`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" })
    .format(new Date(dateStr + "T00:00:00"));
}

const CAT_EMOJI: Record<string, string> = {
  birthday: "🎂",
  work:     "💼",
  personal: "⭐",
};

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */

function ProfileHero({
  avatarUrl,
  avatarFallback,
  fullName,
  email,
  createdAt,
  points,
  hasCare,
  surveyCompleted,
  onAvatarChange,
}: {
  avatarUrl: string | null;
  avatarFallback: string;
  fullName: string;
  email: string | null;
  createdAt: string | null;
  points: number;
  hasCare: boolean;
  surveyCompleted: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="pr-hero">
      {/* Atmospheric background layer */}
      <div className="pr-hero__glow" aria-hidden="true" />

      <div className="pr-hero__inner">
        {/* Avatar */}
        <div className="pr-avatar-wrap">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="avatar"
              width={80}
              height={80}
              className="pr-avatar-img"
              unoptimized
            />
          ) : (
            <div className="pr-avatar-placeholder">
              {avatarFallback}
            </div>
          )}
          <label className="pr-avatar-edit" aria-label="Zmień zdjęcie profilowe">
            <span aria-hidden="true">✏️</span>
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="pr-avatar-input"
            />
          </label>
        </div>

        {/* Identity */}
        <div className="pr-hero__identity">
          <h1 className="pr-hero__name">{fullName || "Twoje imię"}</h1>
          {email && <p className="pr-hero__email">{email}</p>}
          {createdAt && (
            <p className="pr-hero__since">
              Z nami od {new Date(createdAt).toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="pr-badges">
        <span className="pr-badge pr-badge--points">⭐ {points} pkt</span>
        {hasCare && (
          <span className="pr-badge pr-badge--care">💛 Care aktywne</span>
        )}
        {surveyCompleted ? (
          <span className="pr-badge pr-badge--done">✅ Ankieta</span>
        ) : (
          <Link href="/survey" className="pr-badge pr-badge--cta">
            +100 pkt za ankietę →
          </Link>
        )}
      </div>
    </section>
  );
}

function CareBanner() {
  return (
    <section className="pr-care-banner">
      <div className="pr-care-banner__text">
        <p className="pr-care-banner__title">💛 HappyDate Care</p>
        <p className="pr-care-banner__body">
          Pamiętamy za Ciebie — przypomnienia, AI podpowiedzi i więcej.
        </p>
      </div>
      <Link href="/care" className="pr-care-banner__cta">
        Od 29 zł/mies →
      </Link>
    </section>
  );
}

function EditProfileCard({
  fullName,
  saving,
  message,
  onChange,
  onSubmit,
}: {
  fullName: string;
  saving: boolean;
  message: string | null;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section className="pr-card">
      <p className="pr-card__eyebrow">Twój profil</p>
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

function AddEventCard({
  newTitle,
  newDate,
  onTitleChange,
  onDateChange,
  onSubmit,
}: {
  newTitle: string;
  newDate: string;
  onTitleChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section className="pr-card">
      <p className="pr-card__eyebrow">Nowe wydarzenie</p>
      <form onSubmit={onSubmit} className="pr-form">
        <div className="pr-field">
          <label className="pr-field__label" htmlFor="pr-event-title">Tytuł</label>
          <input
            id="pr-event-title"
            className="pr-input"
            type="text"
            placeholder="Co chcesz zapamiętać?"
            value={newTitle}
            onChange={e => onTitleChange(e.target.value)}
          />
        </div>
        <div className="pr-field">
          <label className="pr-field__label" htmlFor="pr-event-date">Data</label>
          <input
            id="pr-event-date"
            className="pr-input pr-input--date"
            type="date"
            value={newDate}
            onChange={e => onDateChange(e.target.value)}
          />
        </div>
        <button className="pr-btn-primary" type="submit">
          Dodaj wydarzenie
        </button>
      </form>
    </section>
  );
}

function UpcomingEventsCard({ events }: { events: EventRow[] }) {
  if (!events.length) return null;
  return (
    <section className="pr-card">
      <p className="pr-card__eyebrow">Nadchodzące</p>
      <ul className="pr-events">
        {events.map((ev, i) => {
          const emoji = CAT_EMOJI[ev.category ?? ""] ?? "📅";
          const diff  = Math.round(
            (new Date(ev.date + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86_400_000
          );
          const urgent = diff >= 0 && diff <= 3;
          return (
            <li key={ev.id} className={`pr-event${urgent ? " pr-event--urgent" : ""}`}
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="pr-event__icon">{emoji}</div>
              <div className="pr-event__info">
                <p className="pr-event__title">{ev.title}</p>
                <p className="pr-event__meta">
                  <span>{formatDate(ev.date)}</span>
                  <span className={`pr-event__pill${urgent ? " pr-event__pill--urgent" : ""}`}>
                    {daysLabel(ev.date)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="pr-logout">
      <button className="pr-btn-ghost" onClick={onLogout}>
        Wyloguj się
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
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

  const [events,          setEvents]          = useState<EventRow[]>([]);
  const [points,          setPoints]          = useState(0);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [hasCare,         setHasCare]         = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDate,  setNewDate]  = useState("");

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

      await refreshEvents(user.id);
    };
    load();
  }, [router]);

  const refreshEvents = async (uid: string) => {
    const { data } = await supabase
      .from("events").select("id,title,date,category")
      .eq("user_id", uid).order("date", { ascending: true }).limit(5);
    setEvents(data ?? []);
  };

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

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0]; if (!file) return;
    const ext      = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (error) { setMessage(error.message); return; }
    setAvatarPath(filePath);
    setMessage("Zdjęcie przesłane ✅ Kliknij Zapisz.");
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle || !newDate) return;
    const { error } = await supabase.from("events")
      .insert({ user_id: userId, title: newTitle, date: newDate });
    if (error) { setMessage(error.message); return; }
    setNewTitle(""); setNewDate("");
    await refreshEvents(userId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const avatarFallback = fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

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
        onAvatarChange={onAvatarChange}
      />

      {!hasCare && <CareBanner />}

      <EditProfileCard
        fullName={fullName}
        saving={saving}
        message={message}
        onChange={setFullName}
        onSubmit={save}
      />

      <AddEventCard
        newTitle={newTitle}
        newDate={newDate}
        onTitleChange={setNewTitle}
        onDateChange={setNewDate}
        onSubmit={addEvent}
      />

      <UpcomingEventsCard events={events} />

      <LogoutButton onLogout={handleLogout} />
    </main>
  );
}