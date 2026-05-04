"use client";

// src/components/HomePageClient.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AssistantCard, { AssistantEvent, AssistantState } from "./assistant/AssistantCard";
import FloatingActions from "@/components/FloatingActions";
import ChatUIMount from "@/components/ChatUIMount";

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export default function HomePageClient() {
  const [loading,   setLoading]   = useState(true);
  const [authState, setAuthState] = useState<AssistantState>("guest");
  const [firstName, setFirstName] = useState<string | undefined>();
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!cancelled && profile?.full_name) {
        setFirstName(profile.full_name.split(" ")[0]);
      }

      const today   = new Date().toISOString().split("T")[0];
      const in14    = new Date();
      in14.setDate(in14.getDate() + 14);
      const in14str = in14.toISOString().split("T")[0];

      const { data: events } = await supabase
        .from("events")
        .select("id, title, date, is_important, person_name")
        .eq("user_id", user.id)
        .gte("date", today)
        .lte("date", in14str)
        .order("is_important", { ascending: false })
        .order("date", { ascending: true })
        .limit(1);

      if (cancelled) return;

      const ev = events?.[0] ?? null;
      if (ev) {
        const days = getDaysUntil(ev.date);
        setNextEvent({ id: ev.id, title: ev.title, date: ev.date, person_name: ev.person_name ?? null, is_important: ev.is_important ?? false });
        setDaysUntil(days);
        setAuthState(days <= 1 ? "urgent" : "user");
      } else {
        setAuthState("user");
      }
      setLoading(false);
    }

    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { cancelled = true; listener?.subscription?.unsubscribe(); };
  }, []);

  return (
    <main style={{ background: "var(--color-background-tertiary)", minHeight: "100vh" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "12px 14px 0" }}>
        {loading && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "var(--color-background-secondary)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: "10px", borderRadius: "5px", width: "60%", background: "var(--color-background-secondary)", marginBottom: "8px" }} />
                <div style={{ height: "16px", borderRadius: "5px", width: "80%", background: "var(--color-background-secondary)" }} />
              </div>
            </div>
          </div>
        )}
        {!loading && (
          <AssistantCard state={authState} firstName={firstName} nextEvent={nextEvent} daysUntilEvent={daysUntil} />
        )}
      </div>

      {!loading && authState === "guest" && (
        <section style={{ background: "linear-gradient(135deg,#fce7f3 0%,#fef9c3 50%,#dbeafe 100%)", padding: "40px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(22px,5vw,32px)", fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: "12px" }}>
            HappyDate — spokój, że o ważnych chwilach ktoś pamięta za Ciebie 💛
          </h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: "420px", margin: "0 auto 20px" }}>
            Zapisuj ważnych ludzi, ich daty i drobne detale. My przypomnimy w odpowiednim momencie.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "280px", margin: "0 auto" }}>
            <Link href="/auth/login" style={{ padding: "13px", background: "#3a9bd5", color: "#fff", borderRadius: "var(--border-radius-md)", fontSize: "15px", fontWeight: 500, textDecoration: "none", textAlign: "center" }}>Zacznij za darmo</Link>
            <Link href="/services" style={{ padding: "13px", background: "#fbbf24", color: "#78350f", borderRadius: "var(--border-radius-md)", fontSize: "15px", fontWeight: 500, textDecoration: "none", textAlign: "center" }}>💛 Zobacz Care</Link>
          </div>
        </section>
      )}

      {!loading && authState !== "guest" && (
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            {[
              { label: "Osoby", href: "/people", emoji: "👥" },
              { label: "Notatki", href: "/notes", emoji: "📝" },
              { label: "Kalendarz", href: "/calendar", emoji: "📅" },
              { label: "Usługi", href: "/services", emoji: "✨" },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", textDecoration: "none" }}>
                <span style={{ fontSize: "18px" }}>{item.emoji}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <FloatingActions />
      <ChatUIMount />
      <CookieConsent />
    </main>
  );
}

function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!localStorage.getItem("happydate_cookie_consent")) setVisible(true); }, []);
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(30,30,30,0.95)", color: "#fff", padding: "14px 20px", zIndex: 50 }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <p style={{ fontSize: "13px", margin: 0 }}>Używamy cookies zgodnie z <Link href="/privacy" style={{ color: "#60a5fa", textDecoration: "underline" }}>Polityką Prywatności</Link>.</p>
        <button onClick={() => { localStorage.setItem("happydate_cookie_consent", "true"); setVisible(false); }} style={{ background: "#3a9bd5", color: "#fff", border: "none", padding: "7px 16px", borderRadius: "var(--border-radius-md)", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Akceptuję</button>
      </div>
    </div>
  );
}