"use client";

// src/components/assistant/SuggestionCard.tsx
// Легка підказка під асистентом — мінімальна, не нав'язлива

import { AssistantState, AssistantEvent, AssistantProfile } from "./types";

interface Props {
  state: AssistantState;
  profile?: AssistantProfile;
  nextEvent?: AssistantEvent | null;
}

function getSuggestion(state: AssistantState, profile?: AssistantProfile, nextEvent?: AssistantEvent | null): string {
  // Персоналізована підказка якщо є preferences
  if (profile?.preferences && state === "active" && nextEvent?.person_name) {
    return `💡 Pamiętam preferencje ${nextEvent.person_name} — mam dla Ciebie trafny pomysł 🎁`;
  }

  switch (state) {
    case "guest":
      return "💡 Dodaj pierwszą osobę, a będę Ci przypominał o wszystkim, co ważne.";
    case "calm":
      return "💡 Wskazówka: Dodaj preferencje osoby, a podpowiem idealny prezent 🎁";
    case "active":
      return `💡 Im więcej wiem o ${nextEvent?.person_name ?? "tej osobie"}, tym lepiej mogę pomóc.`;
    case "urgent":
      return "🔥 Mam gotowe rozwiązania na ostatnią chwilę — szybko i z sercem.";
  }
}

export default function SuggestionCard({ state, profile, nextEvent }: Props) {
  const text = getSuggestion(state, profile, nextEvent);

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 13px",
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-md)",
      marginBottom: 10,
    }}>
      <div style={{
        width: 6, height: 6,
        borderRadius: "50%",
        background: "#3a9bd5",
        flexShrink: 0,
        marginTop: 4,
      }} />
      <p style={{
        fontSize: 12,
        color: "var(--color-text-secondary)",
        lineHeight: 1.55,
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}