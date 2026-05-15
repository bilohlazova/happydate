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
    <section className="profile-hero hd-card">
      <div className="profile-hero__row">
        {/* Avatar */}
        <div className="profile-avatar-wrap">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="avatar"
              width={72}
              height={72}
              className="profile-avatar-img"
              unoptimized
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {avatarFallback}
            </div>
          )}
          <label className="profile-avatar-change" aria-label="Zmień avatar">
            ✏️
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="profile-avatar-input"
            />
          </label>
        </div>

        {/* Identity */}
        <div className="profile-hero__info">
          <p className="profile-hero__name">{fullName || "Twoje imię"}</p>
          {email    && <p className="profile-hero__email">{email}</p>}
          {createdAt && (
            <p className="profile-hero__since">
              Konto od {new Date(createdAt).toLocaleDateString("pl-PL")}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="profile-badges">
        <span className="profile-badge profile-badge--points">⭐ {points} pkt</span>

        {hasCare && (
          <span className="profile-badge profile-badge--care">💛 Care aktywne</span>
        )}

        {surveyCompleted ? (
          <span className="profile-badge profile-badge--survey-done">✅ ankieta</span>
        ) : (
          <Link href="/survey" className="profile-badge profile-badge--survey-cta">
            +100 pkt za ankietę
          </Link>
        )}
      </div>
    </section>
  );
}

function CareBanner() {
  return (
    <section className="profile-care-banner">
      <p className="profile-care-banner__title">💛 Wypróbuj HappyDate Care</p>
      <p className="profile-care-banner__body">
        Pamiętamy za Ciebie — przypomnienia, AI podpowiedzi i więcej. Od 29 zł/mies.
      </p>
      <Link href="/care" className="profile-care-banner__cta">
        Zobacz Care →
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
    <section className="hd-card profile-card">
      <p className="profile-card__label">Edytuj profil</p>
      <form onSubmit={onSubmit} className="profile-form">
        <input
          className="profile-input"
          type="text"
          placeholder="Imię i nazwisko"
          value={fullName}
          onChange={e => onChange(e.target.value)}
          /* font-size ≥ 16px applied via .profile-input in CSS — prevents iOS zoom */
        />
        <button
          className="btn btn-primary profile-form__submit"
          type="submit"
          disabled={saving}
        >
          {saving ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </form>
      {message && (
        <p className="profile-message">{message}</p>
      )}
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
    <section className="hd-card profile-card">
      <p className="profile-card__label">Dodaj wydarzenie</p>
      <form onSubmit={onSubmit} className="profile-form">
        <input
          className="profile-input"
          type="text"
          placeholder="Tytuł"
          value={newTitle}
          onChange={e => onTitleChange(e.target.value)}
        />
        {/*
          type="date" iOS fix:
          • font-size: 16px prevents Safari zoom
          • applied via .profile-input in CSS
        */}
        <input
          className="profile-input profile-input--date"
          type="date"
          value={newDate}
          onChange={e => onDateChange(e.target.value)}
        />
        <button className="btn btn-primary profile-form__submit" type="submit">
          Dodaj wydarzenie
        </button>
      </form>
    </section>
  );
}

function UpcomingEventsCard({ events }: { events: EventRow[] }) {
  if (!events.length) return null;
  return (
    <section className="hd-card profile-card">
      <p className="profile-card__label">Najbliższe wydarzenia</p>
      <ul className="profile-events">
        {events.map(ev => {
          const emoji = CAT_EMOJI[ev.category ?? ""] ?? "📅";
          return (
            <li key={ev.id} className="profile-event-item">
              <div className="profile-event-icon" aria-hidden="true">{emoji}</div>
              <div className="profile-event-info">
                <p className="profile-event-title">{ev.title}</p>
                <p className="profile-event-meta">
                  {formatDate(ev.date)}
                  <span className="profile-event-badge">{daysLabel(ev.date)}</span>
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
    <div className="profile-logout">
      <button className="btn btn-ghost profile-logout__btn" onClick={onLogout}>
        🚪 Wyloguj się
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
    setMessage("Avatar przesłany ✅ Kliknij Zapisz.");
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
    /*
      safe-container  — applies env(safe-area-inset-top/bottom) padding
      profile-shell   — ensures content never slides under bottom navbar
    */
    <main className="safe-container profile-shell">
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