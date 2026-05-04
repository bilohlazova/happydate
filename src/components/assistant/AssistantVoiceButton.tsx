"use client";

// src/components/assistant/AssistantVoiceButton.tsx
// Кнопка голосової взаємодії — завжди user-triggered, ніколи autoplay

interface Props {
  speaking: boolean;
  listening: boolean;
  isGuest?: boolean;
  onClick: () => void;
}

export default function AssistantVoiceButton({ speaking, listening, isGuest, onClick }: Props) {
  const isActive = speaking || listening;

  const label = speaking
    ? "Zatrzymaj"
    : listening
    ? "Słucham…"
    : isGuest
    ? "🎤 Posłuchaj wprowadzenia"
    : "🎤 Porozmawiaj ze mną";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "11px 16px",
        borderRadius: "var(--border-radius-md)",
        border: isActive
          ? "0.5px solid #3a9bd544"
          : "0.5px solid var(--color-border-tertiary)",
        background: isActive
          ? "rgba(58,155,213,0.07)"
          : "var(--color-background-primary)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        color: isActive ? "#3a9bd5" : "var(--color-text-primary)",
        transition: "all .2s",
        marginBottom: 10,
      }}
    >
      {/* mic / pause icon */}
      <svg
        width="13" height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: .7, flexShrink: 0 }}
      >
        {speaking ? (
          <>
            <line x1="6"  y1="4" x2="6"  y2="20" />
            <line x1="18" y1="4" x2="18" y2="20" />
          </>
        ) : listening ? (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </>
        ) : (
          <>
            <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </>
        )}
      </svg>
      {label}
    </button>
  );
}