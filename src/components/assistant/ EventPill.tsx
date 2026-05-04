"use client";

// src/components/assistant/EventPill.tsx

interface EventPillProps {
  title: string;
  personName?: string | null;
  relation?: string | null;
  daysUntil: number;
}

export default function EventPill({ title, personName, relation, daysUntil }: EventPillProps) {
  const chipLabel =
    daysUntil === 0 ? "Dziś" :
    daysUntil === 1 ? "Jutro" :
    `Za ${daysUntil} dni`;

  const chipBg = daysUntil <= 1 ? "#e24b4a" : "#3a9bd5";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "var(--color-background-info)",
        border: "0.5px solid var(--color-border-info)",
        borderRadius: "var(--border-radius-md)",
        padding: "10px 12px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          width: "2px",
          height: "32px",
          background: chipBg,
          flexShrink: 0,
          borderRadius: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {personName && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              marginTop: "2px",
            }}
          >
            {personName}
            {relation ? ` · ${relation}` : ""}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 500,
          color: "#fff",
          background: chipBg,
          padding: "3px 9px",
          borderRadius: "20px",
          flexShrink: 0,
        }}
      >
        {chipLabel}
      </span>
    </div>
  );
}