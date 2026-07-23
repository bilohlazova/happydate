"use client";

// src/components/assistant/AssistantAvatar.tsx
// Центральний візуальний елемент асистента
// Змінює колір і анімацію залежно від стану

import { AssistantState } from "./types";
import { useTranslations } from "next-intl";

interface Props {
  state: AssistantState;
  speaking: boolean;
  listening: boolean;
  onClick: () => void;
}

const STATE_COLOR: Record<AssistantState, string> = {
  calm:   "#3a9bd5",
  active: "#3a9bd5",
  urgent: "#e24b4a",
  guest:  "#8b8fa8",
};

const BAR_H = [3, 8, 5, 11, 4, 9, 3];

export default function AssistantAvatar({ state, speaking, listening, onClick }: Props) {
  const t = useTranslations("assistant.legacyActions");
  const color = STATE_COLOR[state];
  const isAnimated = speaking || listening;

  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>

      {/* outer pulse ring */}
      <div style={{
        position: "absolute",
        inset: -10,
        borderRadius: "50%",
        border: `1px solid ${color}33`,
        animation: "avatarRing 3s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* middle ring — only when active */}
      {isAnimated && (
        <div style={{
          position: "absolute",
          inset: -5,
          borderRadius: "50%",
          border: `1.5px solid ${color}55`,
          animation: "avatarRingFast 1.2s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* main orb */}
      <button
        onClick={onClick}
        aria-label={speaking ? t("stop") : listening ? t("listening") : t("talk")}
        style={{
          width: 72, height: 72,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${color}dd, ${color})`,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: isAnimated
            ? `0 0 0 4px ${color}22, 0 4px 24px ${color}44`
            : `0 4px 16px ${color}33`,
          transition: "box-shadow 0.4s, transform 0.15s",
          animation: "avatarBreathe 4s ease-in-out infinite",
        }}
      >
        {/* glass highlight */}
        <div style={{
          position: "absolute",
          top: "-15%", left: "-8%",
          width: "52%", height: "46%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }} />

        {/* voice bars */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, zIndex: 1 }}>
          {BAR_H.map((h, i) => (
            <div key={i} style={{
              width: 2,
              height: h,
              borderRadius: 2,
              background: "rgba(255,255,255,0.9)",
              animation: isAnimated
                ? `barSpeak 0.5s ease-in-out infinite ${i * 0.07}s`
                : `barIdle 2.8s ease-in-out infinite ${i * 0.1}s`,
              opacity: isAnimated ? 1 : 0.45,
            }} />
          ))}
        </div>

        {/* listening label */}
        {listening && !speaking && (
          <div style={{
            position: "absolute",
            bottom: 8,
            fontSize: 8,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 500,
            letterSpacing: ".05em",
          }}>
            SŁUCHAM
          </div>
        )}
      </button>

      <style>{`
        @keyframes avatarBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.035); }
        }
        @keyframes avatarRing {
          0%, 100% { opacity: .4; transform: scale(1); }
          50%       { opacity: .9; transform: scale(1.05); }
        }
        @keyframes avatarRingFast {
          0%, 100% { opacity: .6; transform: scale(1); }
          50%       { opacity: 1;  transform: scale(1.08); }
        }
        @keyframes barIdle {
          0%, 100% { transform: scaleY(1);   opacity: .4; }
          50%       { transform: scaleY(1.9); opacity: .9; }
        }
        @keyframes barSpeak {
          0%, 100% { transform: scaleY(1); }
          50%       { transform: scaleY(4); }
        }
      `}</style>
    </div>
  );
}
