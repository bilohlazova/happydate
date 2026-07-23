"use client";

// src/components/assistant/SuggestionCard.tsx
// Легка підказка під асистентом — мінімальна, не нав'язлива

import { AssistantState, AssistantEvent, AssistantProfile } from "./types";
import { useTranslations } from "next-intl";

interface Props {
  state: AssistantState;
  profile?: AssistantProfile;
  nextEvent?: AssistantEvent | null;
}

function getSuggestion(
  t: ReturnType<typeof useTranslations<"assistant.legacyMessages">>,
  state: AssistantState,
  profile?: AssistantProfile,
  nextEvent?: AssistantEvent | null
): string {
  // Персоналізована підказка якщо є preferences
  if (profile?.preferences && state === "active" && nextEvent?.person_name) {
    return `💡 ${t("suggestion.preferences", { person: nextEvent.person_name })}`;
  }

  switch (state) {
    case "guest":
      return `💡 ${t("suggestion.guest")}`;
    case "calm":
      return `💡 ${t("suggestion.calm")}`;
    case "active":
      return `💡 ${t("suggestion.active", { person: nextEvent?.person_name ?? t("thisPerson") })}`;
    case "urgent":
      return `🔥 ${t("suggestion.urgent")}`;
  }
}

export default function SuggestionCard({ state, profile, nextEvent }: Props) {
  const t = useTranslations("assistant.legacyMessages");
  const text = getSuggestion(t, state, profile, nextEvent);

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
