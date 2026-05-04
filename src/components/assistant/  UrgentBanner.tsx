"use client";

// src/components/assistant/UrgentBanner.tsx

interface UrgentBannerProps {
  title: string;
  personName?: string | null;
  daysUntil: number;
}

export default function UrgentBanner({ title, personName, daysUntil }: UrgentBannerProps) {
  const timeLabel = daysUntil === 0 ? "To dziś!" : "Zostało mniej niż 24h";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: "var(--color-background-danger)",
        border: "0.5px solid var(--color-border-danger)",
        borderRadius: "var(--border-radius-md)",
        padding: "11px 13px",
        marginBottom: "12px",
      }}
    >
      <div style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>⚠️</div>
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-danger)",
          }}
        >
          {title}
          {personName ? ` — ${personName}` : ""}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-danger)",
            opacity: 0.8,
            marginTop: "2px",
          }}
        >
          {timeLabel}
        </div>
      </div>
    </div>
  );
}