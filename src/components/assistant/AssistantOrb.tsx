"use client";

// src/components/assistant/AssistantOrb.tsx

interface AssistantOrbProps {
  speaking: boolean;
  urgent?: boolean;
  onClick: () => void;
}

const BAR_HEIGHTS = [3, 9, 5, 11, 4];

export default function AssistantOrb({ speaking, urgent = false, onClick }: AssistantOrbProps) {
  const baseColor = urgent ? "#e24b4a" : "#3a9bd5";
  const glowColor = urgent
    ? "rgba(226,75,74,0.25)"
    : "rgba(58,155,213,0.25)";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* pulse ring */}
      <div
        style={{
          position: "absolute",
          inset: "-6px",
          borderRadius: "50%",
          border: `1px solid ${glowColor}`,
          animation: "hdRing 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* orb body */}
      <button
        onClick={onClick}
        aria-label={speaking ? "Zatrzymaj asystenta" : "Posłuchaj asystenta"}
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: baseColor,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: speaking
            ? `0 4px 24px ${glowColor.replace("0.25", "0.55")}`
            : `0 2px 12px ${glowColor}`,
          transition: "box-shadow 0.3s",
          animation: "hdBreathe 4s ease-in-out infinite",
        }}
      >
        {/* glass shine */}
        <div
          style={{
            position: "absolute",
            top: "-18%",
            left: "-8%",
            width: "50%",
            height: "45%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            pointerEvents: "none",
          }}
        />
        {/* voice bars */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5px", zIndex: 1 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                width: "2px",
                height: `${h}px`,
                borderRadius: "2px",
                background: "rgba(255,255,255,0.85)",
                animation: speaking
                  ? `hdBarSpeak 0.45s ease-in-out infinite ${i * 0.08}s`
                  : `hdBarIdle 2.5s ease-in-out infinite ${i * 0.1}s`,
                opacity: speaking ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </button>

      <style>{`
        @keyframes hdBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes hdRing {
          0%, 100% { opacity: .4; transform: scale(1); }
          50%       { opacity: 1;  transform: scale(1.04); }
        }
        @keyframes hdBarIdle {
          0%, 100% { transform: scaleY(1);   opacity: .35; }
          50%       { transform: scaleY(1.8); opacity: 1; }
        }
        @keyframes hdBarSpeak {
          0%, 100% { transform: scaleY(1); }
          50%       { transform: scaleY(4.5); }
        }
      `}</style>
    </div>
  );
}