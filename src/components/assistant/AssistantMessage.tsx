"use client";

// src/components/assistant/AssistantMessage.tsx
// Генерує емоційно правильний текст залежно від стану і контексту

import { AssistantState, AssistantEvent, daysUntil } from "./types";
import { useTranslations } from "next-intl";

interface Props {
  state: AssistantState;
  firstName?: string;
  nextEvent?: AssistantEvent | null;
  preferences?: string | null;
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

// Головне повідомлення асистента
function buildPrimary(t: AssistantText, state: AssistantState, firstName?: string, nextEvent?: AssistantEvent | null): string {
  const greet = getGreeting(t);
  const name = firstName ? `, ${firstName}` : "";

  switch (state) {
    case "guest":
      return `${greet} 💛\n${t("primary.guest.line2")}\n${t("primary.guest.line3")}`;

    case "calm":
      return `${greet}${name} 💛\n${t("primary.calm.line2")}\n${t("primary.calm.line3")}`;

    case "active":
      if (!nextEvent) return `${greet}${name} 💛\n${t("primary.active.fallback")}`;
      return `${greet}${name} 💛\n${t("primary.active.intro")}:\n🎂 ${nextEvent.title} — ${getDayLabel(nextEvent.date, t)}`;

    case "urgent":
      if (!nextEvent) return `⚠️ ${t("primary.urgent.withoutEvent", { name: firstName ?? t("fallbackName") })}`;
      const dayStr = daysUntil(nextEvent.date) === 0 ? t("day.todayPlain") : t("day.tomorrow");
      return `⚠️ ${t("primary.urgent.withEvent", { name: firstName ?? t("fallbackName"), day: dayStr })}\n🎂 ${nextEvent.title}`;
  }
}

// Другорядне / call-to-action повідомлення
function buildSecondary(t: AssistantText, state: AssistantState): string {
  switch (state) {
    case "guest":
      return t("secondary.guest");
    case "calm":
      return t("secondary.calm");
    case "active":
      return t("secondary.active");
    case "urgent":
      return t("secondary.urgent");
  }
}

export default function AssistantMessage({ state, firstName, nextEvent }: Props) {
  const t = useTranslations("assistant.legacyMessages");
  const primary   = buildPrimary(t, state, firstName, nextEvent);
  const secondary = buildSecondary(t, state);

  const lines = primary.split("\n");

  return (
    <div style={{ flex: 1, minWidth: 0 }}>

      {/* AI label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginBottom: 5,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: state === "urgent" ? "#e24b4a" : "#3a9bd5",
          animation: "msgDot 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: ".1em",
          textTransform: "uppercase" as const,
          color: state === "urgent" ? "#e24b4a" : "#3a9bd5",
        }}>
          {state === "urgent" ? t("urgentLabel") : "HappyDate AI"}
        </span>
      </div>

      {/* primary message */}
      {lines.map((line, i) => (
        <p key={i} style={{
          fontSize: i === 0 ? 16 : 14,
          fontWeight: i === 0 ? 500 : 400,
          color: i === 0
            ? "var(--color-text-primary)"
            : "var(--color-text-secondary)",
          lineHeight: 1.4,
          margin: i === 0 ? "0 0 4px" : "0 0 2px",
        }}>
          {line}
        </p>
      ))}

      {/* secondary / CTA */}
      <p style={{
        fontSize: 12,
        color: "var(--color-text-secondary)",
        lineHeight: 1.45,
        margin: "6px 0 0",
        fontStyle: state === "urgent" ? "normal" : "italic" as const,
      }}>
        {secondary}
      </p>

      <style>{`
        @keyframes msgDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .3; transform: scale(.7); }
        }
      `}</style>
    </div>
  );
}

// ── Export speech text for voice ────────────────────────────
export function buildSpeechText(
  state: AssistantState,
  firstName?: string,
  nextEvent?: AssistantEvent | null,
  copy?: {
    greeting: string;
    dayLabel: (date: string) => string;
    guest: string;
    calm: string;
    activeFallback: string;
    activeEvent: (title: string, day: string) => string;
    urgent: (name: string, day: string, title: string) => string;
  }
): string {
  const greet = copy?.greeting ?? "Good day";
  const name = firstName ?? "";

  switch (state) {
    case "guest":
      return copy?.guest ?? `${greet}! I can help you remember important people and moments.`;

    case "calm":
      return copy?.calm ?? `${greet}${name ? ", " + name : ""}! Everything is under control.`;

    case "active":
      if (!nextEvent) return copy?.activeFallback ?? `${greet}${name ? ", " + name : ""}! You have an upcoming event.`;
      return copy?.activeEvent(nextEvent.title, copy.dayLabel(nextEvent.date)) ?? `${greet}${name ? ", " + name : ""}! ${nextEvent.title}.`;

    case "urgent":
      const dayStr = nextEvent && daysUntil(nextEvent.date) === 0 ? "today" : "tomorrow";
      return copy?.urgent(name, dayStr, nextEvent?.title ?? "important event") ?? `${name ? name + ", " : ""}important: ${nextEvent?.title ?? "important event"}.`;
  }
}
