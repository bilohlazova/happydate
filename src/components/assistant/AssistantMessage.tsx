"use client";

// src/components/assistant/AssistantMessage.tsx
// Генерує емоційно правильний текст залежно від стану і контексту

import { AssistantState, AssistantEvent, daysUntil } from "./types";

interface Props {
  state: AssistantState;
  firstName?: string;
  nextEvent?: AssistantEvent | null;
  preferences?: string | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Dzień dobry";
  if (h >= 12 && h < 18) return "Dobry dzień";
  if (h >= 18 && h < 22) return "Dobry wieczór";
  return "Dobranoc";
}

function getDayLabel(dateStr: string): string {
  const d = daysUntil(dateStr);
  if (d === 0) return "dziś!";
  if (d === 1) return "jutro";
  return `za ${d} ${d < 5 ? "dni" : "dni"}`;
}

// Головне повідомлення асистента
function buildPrimary(state: AssistantState, firstName?: string, nextEvent?: AssistantEvent | null): string {
  const greet = getGreeting();
  const name = firstName ? `, ${firstName}` : "";

  switch (state) {
    case "guest":
      return `${greet} 💛\nCieszę się, że jesteś.\nPomogę Ci pamiętać o ważnych osobach i chwilach.`;

    case "calm":
      return `${greet}${name} 💛\nDziś spokojny dzień.\nWszystko masz pod kontrolą.`;

    case "active":
      if (!nextEvent) return `${greet}${name} 💛\nMasz nadchodzące wydarzenie.`;
      return `${greet}${name} 💛\nMasz ważne wydarzenie:\n🎂 ${nextEvent.title} — ${getDayLabel(nextEvent.date)}`;

    case "urgent":
      if (!nextEvent) return `⚠️ ${firstName ?? "Hej"}, jutro ważny dzień!`;
      const dayStr = daysUntil(nextEvent.date) === 0 ? "dziś" : "jutro";
      return `⚠️ ${firstName ?? "Hej"}, ${dayStr} ważny dzień!\n🎂 ${nextEvent.title}`;
  }
}

// Другорядне / call-to-action повідомлення
function buildSecondary(state: AssistantState): string {
  switch (state) {
    case "guest":
      return "Zacznij od dodania pierwszej ważnej osoby.";
    case "calm":
      return "Chcesz coś zaplanować lub dodać?";
    case "active":
      return "Chcesz, żebym pomógł z przygotowaniami?";
    case "urgent":
      return "Nie zostawiaj tego na ostatnią chwilę 😉";
  }
}

export default function AssistantMessage({ state, firstName, nextEvent }: Props) {
  const primary   = buildPrimary(state, firstName, nextEvent);
  const secondary = buildSecondary(state);

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
          {state === "urgent" ? "Uwaga — pilne" : "HappyDate AI"}
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
  nextEvent?: AssistantEvent | null
): string {
  const greet = getGreeting();
  const name = firstName ?? "";

  switch (state) {
    case "guest":
      return `${greet}! Cieszę się, że jesteś. Pomogę Ci pamiętać o ważnych osobach i chwilach. Zacznij od dodania pierwszej osoby.`;

    case "calm":
      return `${greet}${name ? ", " + name : ""}! Dziś spokojny dzień. Wszystko masz pod kontrolą. Chcesz coś zaplanować?`;

    case "active":
      if (!nextEvent) return `${greet}${name ? ", " + name : ""}! Masz nadchodzące wydarzenie. Mogę pomóc z przygotowaniami.`;
      return `${greet}${name ? ", " + name : ""}! Pamiętam — ${nextEvent.title} ${getDayLabel(nextEvent.date)}. Chcesz, żebym pomógł?`;

    case "urgent":
      const dayStr = nextEvent && daysUntil(nextEvent.date) === 0 ? "dziś" : "jutro";
      return `${name ? name + ", " : ""}ważne! ${dayStr} — ${nextEvent?.title ?? "ważne wydarzenie"}. Nie zostawiaj tego na ostatnią chwilę. Mogę pomóc natychmiast.`;
  }
}
