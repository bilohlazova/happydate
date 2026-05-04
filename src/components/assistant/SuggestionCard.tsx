"use client";

// src/components/assistant/SuggestionCard.tsx

interface SuggestionCardProps {
  text: string;
}

export default function SuggestionCard({ text }: SuggestionCardProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        padding: "11px 13px",
        marginBottom: "10px",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "#3a9bd5",
          flexShrink: 0,
          marginTop: "5px",
        }}
      />
      <p
        style={{
          fontSize: "12px",
          color: "var(--color-text-secondary)",
          lineHeight: 1.55,
          margin: 0,
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}