"use client";

// src/components/assistant/AssistantCard.tsx
// Єдиний файл — всі типи, хелпери і підкомпоненти всередині

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// ─── TYPES ──────────────────────────────────────────────────
export type AssistantState = "guest" | "calm" | "active" | "urgent";

export interface AssistantEvent {
  id: string;
  title: string;
  date: string;
  person_name?: string | null;
  relation?: string | null;
  is_important?: boolean;
  category?: string | null;
}

export interface AssistantProfile {
  firstName?: string;
  preferences?: string | null;
  avatarUrl?: string | null;
}

// ─── HELPERS ────────────────────────────────────────────────
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function resolveState(
  isLoggedIn: boolean,
  nextEvent: AssistantEvent | null
): AssistantState {
  if (!isLoggedIn) return "guest";
  if (!nextEvent) return "calm";
  return daysUntil(nextEvent.date) <= 1 ? "urgent" : "active";
}

type AssistantText = ReturnType<typeof useTranslations<"assistant.legacyMessages">>;

function getGreeting(t: AssistantText): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return t("greeting.morning");
  if (h >= 12 && h < 18) return t("greeting.afternoon");
  if (h >= 18 && h < 22) return t("greeting.evening");
  return t("greeting.night");
}

function getDayLabel(dateStr: string, t: AssistantText): string {
  const d = daysUntil(dateStr);
  if (d === 0) return t("day.today");
  if (d === 1) return t("day.tomorrow");
  return t("day.days", { count: d });
}

// ─── SPEECH ─────────────────────────────────────────────────
function buildSpeech(
  t: AssistantText,
  state: AssistantState,
  firstName?: string,
  nextEvent?: AssistantEvent | null
): string {
  const greet = getGreeting(t);
  const n = firstName ? `, ${firstName}` : "";
  switch (state) {
    case "guest":
      return t("speech.guest", { greeting: greet });
    case "calm":
      return t("speech.calm", { greeting: `${greet}${n}` });
    case "active":
      if (!nextEvent) return t("speech.activeFallback", { greeting: `${greet}${n}` });
      return t("speech.activeEvent", { greeting: `${greet}${n}`, title: nextEvent.title, day: getDayLabel(nextEvent.date, t) });
    case "urgent":
      return t("speech.urgent", {
        name: firstName ?? t("fallbackName"),
        title: nextEvent?.title ?? t("importantEvent"),
        day: nextEvent?.date ? getDayLabel(nextEvent.date, t) : t("day.tomorrow"),
      });
  }
}

// ─── AVATAR ─────────────────────────────────────────────────
const STATE_COLOR: Record<AssistantState, string> = {
  calm: "#3a9bd5", active: "#3a9bd5",
  urgent: "#e24b4a", guest: "#8b8fa8",
};
const BAR_H = [3, 8, 5, 11, 4, 9, 3];

function Avatar({ state, speaking, onClick }: {
  state: AssistantState; speaking: boolean; onClick: () => void;
}) {
  const t = useTranslations("assistant.legacyActions");
  const c = STATE_COLOR[state];
  return (
    <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        border: `1px solid ${c}33`,
        animation: "hdRing 3s ease-in-out infinite", pointerEvents: "none",
      }} />
      {speaking && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: `1.5px solid ${c}55`,
          animation: "hdRingFast 1s ease-in-out infinite", pointerEvents: "none",
        }} />
      )}
      <button onClick={onClick} aria-label={t("talk")} style={{
        width: 64, height: 64, borderRadius: "50%",
        background: `linear-gradient(145deg,${c}cc,${c})`,
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        boxShadow: speaking ? `0 0 0 3px ${c}22,0 4px 20px ${c}44` : `0 3px 14px ${c}33`,
        transition: "box-shadow 0.3s",
        animation: "hdBreathe 4s ease-in-out infinite",
      }}>
        <div style={{
          position: "absolute", top: "-15%", left: "-8%",
          width: "52%", height: "46%", borderRadius: "50%",
          background: "rgba(255,255,255,0.22)", pointerEvents: "none",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 2, zIndex: 1 }}>
          {BAR_H.map((h, i) => (
            <div key={i} style={{
              width: 2, height: h, borderRadius: 2,
              background: "rgba(255,255,255,0.9)",
              animation: speaking
                ? `hdBarSpeak 0.5s ease-in-out infinite ${i * 0.07}s`
                : `hdBarIdle 2.8s ease-in-out infinite ${i * 0.1}s`,
              opacity: speaking ? 1 : 0.45,
            }} />
          ))}
        </div>
      </button>
    </div>
  );
}

// ─── MESSAGE ────────────────────────────────────────────────
function Message({ state, firstName, nextEvent }: {
  state: AssistantState; firstName?: string; nextEvent?: AssistantEvent | null;
}) {
  const t = useTranslations("assistant.legacyMessages");
  const greet = getGreeting(t);
  const n = firstName ? `, ${firstName}` : "";

  const lines = ((): string[] => {
    switch (state) {
      case "guest":  return [`${greet} 💛`, t("primary.guest.line2"), t("primary.guest.line3")];
      case "calm":   return [`${greet}${n} 💛`, t("primary.calm.line2"), t("primary.calm.line3")];
      case "active": return [`${greet}${n} 💛`, nextEvent ? `🎂 ${nextEvent.title} — ${getDayLabel(nextEvent.date, t)}` : t("primary.active.fallback")];
      case "urgent": return [`⚠️ ${t("primary.urgent.withEvent", { name: firstName ?? t("fallbackName"), day: t("day.tomorrow") })}`, nextEvent ? `🎂 ${nextEvent.title}` : ""];
    }
  })();

  const cta = ((): string => {
    switch (state) {
      case "guest":  return t("secondary.guest");
      case "calm":   return t("secondary.calm");
      case "active": return t("secondary.active");
      case "urgent": return t("secondary.urgent");
    }
  })();

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: state === "urgent" ? "#e24b4a" : "#3a9bd5",
          animation: "hdDot 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 9, fontWeight: 500, letterSpacing: ".1em",
          textTransform: "uppercase" as const,
          color: state === "urgent" ? "#e24b4a" : "#3a9bd5",
        }}>
          {state === "urgent" ? t("urgentLabel") : "HappyDate AI"}
        </span>
      </div>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} style={{
          fontSize: i === 0 ? 16 : 13, fontWeight: i === 0 ? 500 : 400,
          color: i === 0 ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          lineHeight: 1.4, margin: "0 0 2px",
        }}>{line}</p>
      ))}
      <p style={{
        fontSize: 12, color: "var(--color-text-secondary)",
        lineHeight: 1.45, margin: "6px 0 0",
        fontStyle: state === "urgent" ? "normal" : "italic" as const,
      }}>{cta}</p>
    </div>
  );
}

// ─── EVENT HIGHLIGHT ────────────────────────────────────────
function EventHighlight({ event, urgent }: { event: AssistantEvent; urgent: boolean }) {
  const days = daysUntil(event.date);
  const t = useTranslations("assistant.legacyMessages");
  const chip = getDayLabel(event.date, t);
  if (urgent) {
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "11px 13px", marginBottom: 12,
        background: "var(--color-background-danger)",
        border: "0.5px solid var(--color-border-danger)",
        borderRadius: "var(--border-radius-md)",
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-danger)", margin: "0 0 2px" }}>
            {event.title}{event.person_name ? ` — ${event.person_name}` : ""}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-danger)", opacity: .8, margin: 0 }}>
            {days === 0 ? t("eventHighlight.today") : t("eventHighlight.lessThanDay")}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", marginBottom: 12,
      background: "var(--color-background-info)",
      border: "0.5px solid var(--color-border-info)",
      borderRadius: "var(--border-radius-md)",
    }}>
      <div style={{ width: 2, height: 32, background: "#3a9bd5", flexShrink: 0, borderRadius: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)",
          margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{event.title}</p>
        {event.person_name && (
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
            {event.person_name}{event.relation ? ` · ${event.relation}` : ""}
          </p>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 500, color: "#fff",
        background: "#3a9bd5", padding: "3px 9px", borderRadius: 20, flexShrink: 0,
      }}>{chip}</span>
    </div>
  );
}

// ─── VOICE BUTTON ────────────────────────────────────────────
function VoiceButton({ speaking, isGuest, onClick }: {
  speaking: boolean; isGuest: boolean; onClick: () => void;
}) {
  const t = useTranslations("assistant.legacyActions");

  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8, padding: "11px 16px",
      borderRadius: "var(--border-radius-md)",
      border: speaking ? "0.5px solid #3a9bd544" : "0.5px solid var(--color-border-tertiary)",
      background: speaking ? "rgba(58,155,213,0.07)" : "var(--color-background-primary)",
      cursor: "pointer", fontSize: 13, fontWeight: 500,
      color: speaking ? "#3a9bd5" : "var(--color-text-primary)",
      transition: "all .2s", marginBottom: 10,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" style={{ opacity: .6 }}>
        {speaking
          ? <><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></>
          : <><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/></>
        }
      </svg>
      {speaking ? t("stop") : isGuest ? t("intro") : t("talk")}
    </button>
  );
}

// ─── ACTIONS ────────────────────────────────────────────────
function Actions({ state, onSpeak }: { state: AssistantState; onSpeak: () => void }) {
  const t = useTranslations("assistant.legacyActions");
  type Btn = { icon: string; label: string; href?: string; onClick?: () => void; primary?: boolean; danger?: boolean };

  const btns = ((): Btn[] => {
    switch (state) {
      case "guest":  return [
        { icon: "🎤", label: t("speak"), onClick: onSpeak, primary: true },
        { icon: "👉", label: t("start"), href: "/auth/login" },
      ];
      case "calm":   return [
        { icon: "➕", label: t("addEvent"), href: "/calendar" },
        { icon: "👤", label: t("addPerson"), href: "/people" },
      ];
      case "active": return [
        { icon: "🎁", label: t("giftIdea"), href: "/services" },
        { icon: "✍️", label: t("writeMessage"), href: "/services" },
        { icon: "📦", label: t("orderGift"), href: "/services" },
      ];
      case "urgent": return [
        { icon: "🔥", label: t("quick"), href: "/services", danger: true },
        { icon: "✍️", label: t("writeNow"), href: "/services" },
      ];
    }
  })();

  const cols = btns.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr";
  const base: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 6, padding: "12px 6px", borderRadius: "var(--border-radius-md)",
    cursor: "pointer", textDecoration: "none",
    border: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8 }}>
      {btns.map((b) => {
        const s: React.CSSProperties = {
          ...base,
          background: b.primary ? "#3a9bd5" : b.danger ? "#e24b4a" : base.background as string,
          border: b.primary || b.danger ? "none" : base.border as string,
        };
        const lbl: React.CSSProperties = {
          fontSize: 10, fontWeight: 500, lineHeight: 1.25, textAlign: "center",
          color: b.primary || b.danger ? "#fff" : "var(--color-text-secondary)",
        };
        const inner = (
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{b.icon}</span>
            <span style={lbl}>{b.label}</span>
          </>
        );
        if (b.href) return <Link key={b.label} href={b.href} style={s}>{inner}</Link>;
        return <button key={b.label} onClick={b.onClick} style={{ ...s, border: "none" }}>{inner}</button>;
      })}
    </div>
  );
}

// ─── SUGGESTION ─────────────────────────────────────────────
function Suggestion({ state, nextEvent }: {
  state: AssistantState; nextEvent?: AssistantEvent | null;
}) {
  const t = useTranslations("assistant.legacyMessages");
  const text = ((): string => {
    switch (state) {
      case "guest":  return `💡 ${t("suggestion.guest")}`;
      case "calm":   return `💡 ${t("suggestion.calm")}`;
      case "active": return `💡 ${t("suggestion.active", { person: nextEvent?.person_name ?? t("thisPerson") })}`;
      case "urgent": return `🔥 ${t("suggestion.urgent")}`;
    }
  })();

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 13px",
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-md)", marginBottom: 10,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#3a9bd5", flexShrink: 0, marginTop: 4,
      }} />
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────
interface Props {
  state: AssistantState;
  profile?: AssistantProfile;
  nextEvent?: AssistantEvent | null;
}

export default function AssistantCard({ state, profile, nextEvent }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const t = useTranslations("assistant.legacyMessages");
  const locale = useLocale();

  useEffect(() => {
    return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    setSpeaking(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [state]);

  const handleVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(buildSpeech(t, state, profile?.firstName, nextEvent));
    u.lang = locale; u.rate = 0.9; u.pitch = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [locale, nextEvent, profile, speaking, state, t]);

  return (
    <div>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: 16, marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <Avatar state={state} speaking={speaking} onClick={handleVoice} />
          <Message state={state} firstName={profile?.firstName} nextEvent={nextEvent} />
        </div>
        {nextEvent && (state === "active" || state === "urgent") && (
          <EventHighlight event={nextEvent} urgent={state === "urgent"} />
        )}
        <VoiceButton speaking={speaking} isGuest={state === "guest"} onClick={handleVoice} />
        <Actions state={state} onSpeak={handleVoice} />
      </div>
      <Suggestion state={state} nextEvent={nextEvent} />
      <style>{`
        @keyframes hdBreathe  { 0%,100%{transform:scale(1)}           50%{transform:scale(1.035)} }
        @keyframes hdRing     { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.9;transform:scale(1.05)} }
        @keyframes hdRingFast { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes hdBarIdle  { 0%,100%{transform:scaleY(1);opacity:.4} 50%{transform:scaleY(1.9);opacity:.9} }
        @keyframes hdBarSpeak { 0%,100%{transform:scaleY(1)}           50%{transform:scaleY(4)} }
        @keyframes hdDot      { 0%,100%{opacity:1;transform:scale(1)}  50%{opacity:.3;transform:scale(.7)} }
      `}</style>
    </div>
  );
}
