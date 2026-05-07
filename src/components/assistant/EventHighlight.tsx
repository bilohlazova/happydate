"use client";

// src/components/assistant/EventHighlight.tsx
// Показує найближчу подію всередині картки асистента

import { AssistantEvent, daysUntil } from "./ types";

interface Props {
  event: AssistantEvent;
  urgent?: boolean;
}

export default function EventHighlight({ event, urgent }: Props) {
  const days = daysUntil(event.date);
  const dayLabel = days === 0 ? "Dziś!" : days === 1 ? "Jutro" : `Za ${days} dni`;

  if (urgent) {
    return (
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 13px",
        background: "var(--color-background-danger)",
        border: "0.5px solid var(--color-border-danger)",
        borderRadius: "var(--border-radius-md)",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-danger)", margin: "0 0 2px" }}>
            {event.title}
            {event.person_name ? ` — ${event.person_name}` : ""}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-danger)", opacity: .8, margin: 0 }}>
            {days === 0 ? "To dziś — nie zwlekaj!" : "Zostało mniej niż 24 godziny"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "var(--color-background-info)",
      border: "0.5px solid var(--color-border-info)",
      borderRadius: "var(--border-radius-md)",
      marginBottom: 12,
    }}>
      <div style={{
        width: 2, height: 32,
        background: "#3a9bd5",
        flexShrink: 0,
        borderRadius: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500,
          color: "var(--color-text-primary)",
          margin: "0 0 2px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {event.title}
        </p>
        {event.person_name && (
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
            {event.person_name}{event.relation ? ` · ${event.relation}` : ""}
          </p>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: "#fff",
        background: "#3a9bd5",
        padding: "3px 9px",
        borderRadius: 20,
        flexShrink: 0,
      }}>
        {dayLabel}
      </span>
    </div>
  );
}