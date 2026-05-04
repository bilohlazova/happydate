"use client";

// src/components/HomePageClient.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AssistantCard, {
  AssistantState,
  AssistantEvent,
  AssistantProfile,
  resolveState,
} from "./assistant/AssistantCard";
import FloatingActions from "@/components/FloatingActions";
import ChatUIMount from "@/components/ChatUIMount";

// ── Skeleton ────────────────────────────────────────────────
function AssistantSkeleton() {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--color-background-secondary)",
          animation: "skPulse 1.4s ease-in-out infinite", flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          {[55, 75, 45].map((w, i) => (
            <div key={i} style={{
              height: i === 1 ? 15 : 10, width: `${w}%`, borderRadius: 6,
              background: "var(--color-background-secondary)",
              marginBottom: 8, animation: `skPulse 1.4s ease-in-out infinite ${i * 0.1}s`,
            }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ── Guest hero ───────────────────────────────────────────────
function GuestHero() {
  return (
    <section style={{
      background: "linear-gradient(135deg,#fce7f3 0%,#fef9c3 50%,#dbeafe 100%)",
      padding: "36px 20px", textAlign: "center",
    }}>
      <h1 style={{
        fontSize: "clamp(20px,5vw,28px)", fontWeight: 500,
        color: "var(--color-text-primary)", lineHeight: 1.35, marginBottom: 12,
      }}>
        HappyDate — spokój, że o ważnych chwilach ktoś pamięta za Ciebie 💛
      </h1>
      <p style={{
        fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.65,
        maxWidth: 360, margin: "0 auto 22px",
      }}>
        Zapisuj ważnych ludzi, ich daty i drobne detale. My przypomnimy w odpowiednim momencie.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 260, margin: "0 auto" }}>
        <Link href="/auth/login" style={{
          padding: 13, background: "#3a9bd5", color: "#fff",
          borderRadius: "var(--border-radius-md)", fontSize: 15,
          fontWeight: 500, textDecoration: "none", textAlign: "center",
        }}>Zacznij za darmo</Link>
        <Link href="/services" style={{
          padding: 13, background: "#fbbf24", color: "#78350f",
          borderRadius: "var(--border-radius-md)", fontSize: 15,
          fontWeight: 500, textDecoration: "none", textAlign: "center",
        }}>💛 Zobacz Care</Link>
      </div>
    </section>
  );
}

// ── Quick nav ────────────────────────────────────────────────
function QuickNav() {
  const items = [
    { label: "Osoby",     href: "/people",   emoji: "👥" },
    { label: "Notatki",   href: "/notes",    emoji: "📝" },
    { label: "Kalendarz", href: "/calendar", emoji: "📅" },
    { label: "Usługi",    href: "/services", emoji: "✨" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
      {items.map((item) => (
        <Link key={item.label} href={item.href} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px",
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)", textDecoration: "none",
        }}>
          <span style={{ fontSize: 18 }}>{item.emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── Cookie consent ───────────────────────────────────────────
function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("happydate_cookie_consent")) setVisible(true);
  }, []);
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(20,20,20,0.95)", color: "#fff",
      padding: "13px 20px", zIndex: 50,
    }}>
      <div style={{
        maxWidth: 600, margin: "0 auto",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          Używamy cookies zgodnie z{" "}
          <Link href="/privacy" style={{ color: "#60a5fa", textDecoration: "underline" }}>
            Polityką Prywatności
          </Link>.
        </p>
        <button
          onClick={() => {
            localStorage.setItem("happydate_cookie_consent", "true");
            setVisible(false);
          }}
          style={{
            background: "#3a9bd5", color: "#fff", border: "none",
            padding: "7px 16px", borderRadius: "var(--border-radius-md)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}

// ── MAIN ────────────────────────────────────────────────────
export default function HomePageClient() {
  const [loading,   setLoading]   = useState(true);
  const [authState, setAuthState] = useState<AssistantState>("guest");
  const [profile,   setProfile]   = useState<AssistantProfile>({});
  const [nextEvent, setNextEvent] = useState<AssistantEvent | null>(null);
  const [daysUntil, setDaysUntil] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setAuthState("guest");
        setLoading(false);
        return;
      }

      // Profile
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, preferences, avatar_url")
        .eq("id", user.id)
        .single();

      if (!cancelled && p) {
        setProfile({
          firstName:   p.full_name?.split(" ")[0],
          preferences: p.preferences ?? null,
          avatarUrl:   p.avatar_url  ?? null,
        });
      }

      // Next event (14 days)
      const today  = new Date().toISOString().split("T")[0];
      const in14   = new Date();
      in14.setDate(in14.getDate() + 14);

      const { data: events } = await supabase
        .from("events")
        .select("id, title, date, is_important, person_name, category")
        .eq("user_id", user.id)
        .gte("date", today)
        .lte("date", in14.toISOString().split("T")[0])
        .order("is_important", { ascending: false })
        .order("date",          { ascending: true })
        .limit(1);

      if (cancelled) return;

      const ev = events?.[0] ?? null;

      if (ev) {
        const t = new Date(); t.setHours(0, 0, 0, 0);
        const d = new Date(ev.date); d.setHours(0, 0, 0, 0);
        const days = Math.round((d.getTime() - t.getTime()) / 86_400_000);
        const mapped: AssistantEvent = {
          id: ev.id, title: ev.title, date: ev.date,
          person_name: ev.person_name ?? null,
          is_important: ev.is_important ?? false,
          category: ev.category ?? null,
        };
        setNextEvent(mapped);
        setDaysUntil(days);
        setAuthState(resolveState(true, mapped));
      } else {
        setAuthState("calm");
      }

      setLoading(false);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { cancelled = true; sub?.subscription?.unsubscribe(); };
  }, []);

  const isGuest = authState === "guest";

  return (
    <main style={{ background: "var(--color-background-tertiary)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 14px 0" }}>
        {loading
          ? <AssistantSkeleton />
          : <AssistantCard
              state={authState}
              profile={profile}
              nextEvent={nextEvent}
              daysUntilEvent={daysUntil}
            />
        }
      </div>

      {!loading && isGuest  && <GuestHero />}
      {!loading && !isGuest && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px" }}>
          <QuickNav />
        </div>
      )}

      <FloatingActions />
      <ChatUIMount />
      <CookieConsent />
    </main>
  );
}