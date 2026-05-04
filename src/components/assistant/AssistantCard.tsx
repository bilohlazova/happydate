"use client";

// src/components/assistant/AssistantCard.tsx
// Головний компонент асистента — 3 стани: guest / user / urgent

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AssistantOrb from "./AssistantOrb";
import EventPill from "./ EventPill";
import UrgentBanner from "./  UrgentBanner";
import SuggestionCard from "./SuggestionCard";

export interface AssistantEvent {
  id: string;
  title: string;
  date: string;
  person_name?: string | null;
  relation?: string | null;
  is_important?: boolean;
}

export type AssistantState = "guest" | "user" | "urgent";

interface AssistantCardProps {
  state: AssistantState;
  firstName?: string;
  nextEvent?: AssistantEvent | null;
  daysUntilEvent?: number;
}

// — Greeting by hour —
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Dzień dobry";
  if (h >= 12 && h < 18) return "Dobry dzień";
  if (h >= 18 && h < 22) return "Dobry wieczór";
  return "Dobranoc";
}

// — Dynamic suggestion by state —
function getSuggestion(state: AssistantState, firstName?: string): string {
  if (state === "guest") {
    return "💡 <strong>Wskazówka:</strong> Dodaj pierwszą ważną osobę — urodziny, imieniny lub rocznica.";
  }
  if (state === "urgent") {
    return "🔥 <strong>Nie ma czasu?</strong> Wyślij wiadomość teraz — personalizacja zajmie 30 sekund.";
  }
  return `💡 <strong>${firstName ?? ""}${firstName ? ", pamiętam" : "Wskazówka:"}</strong> że Twoja mama lubi kwiaty 🌷 Może bukiet na urodziny?`;
}

// — Speech text by state —
function getSpeechText(
  state: AssistantState,
  greeting: string,
  firstName?: string,
  nextEvent?: AssistantEvent | null
): string {
  if (state === "guest") {
    return `${greeting}! Cieszę się, że jesteś. Pomogę Ci pamiętać o ważnych osobach i chwilach. Zacznij od dodania pierwszej osoby.`;
  }
  if (state === "urgent" && nextEvent) {
    return `${greeting}, ${firstName}! Uwaga — jutro ${nextEvent.title}${nextEvent.person_name ? " — " + nextEvent.person_name : ""}. Zostało mniej niż dwadzieścia cztery godziny. Mogę pomóc Ci szybko znaleźć rozwiązanie.`;
  }
  if (nextEvent) {
    return `${greeting}, ${firstName}! ${nextEvent.title}${nextEvent.person_name ? " — " + nextEvent.person_name : ""} — mam kilka pomysłów na prezent. Chcesz posłuchać?`;
  }
  return `${greeting}, ${firstName}! Nie masz dziś żadnych nadchodzących wydarzeń. Możesz dodać nową osobę lub datę.`;
}

export default function AssistantCard({
  state,
  firstName,
  nextEvent,
  daysUntilEvent = 0,
}: AssistantCardProps) {
  const greeting = getGreeting();
  const [speaking, setSpeaking] = useState(false);
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // cleanup on unmount
  useEffect(() => {
  const ref = blinkRef;
  return () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (ref.current) clearTimeout(ref.current);
  };
}, []);

  const handleSpeak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = getSpeechText(state, greeting, firstName, nextEvent);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pl-PL";
    u.rate = 0.9;
    u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [speaking, state, greeting, firstName, nextEvent]);

  const isUrgent = state === "urgent";
  const isGuest  = state === "guest";

  // — Greeting text —
  const greetingText =
    isUrgent
      ? `${firstName ? firstName + ", j" : "J"}utro ważna data!`
      : isGuest
      ? `${greeting} 💛`
      : `${greeting}${firstName ? ", " + firstName : ""} 💛`;

  const subText =
    isUrgent && nextEvent
      ? `${nextEvent.title}${nextEvent.person_name ? " — " + nextEvent.person_name : ""} — zostało mniej niż 24h`
      : isGuest
      ? "Cieszę się, że jesteś. Pomogę Ci pamiętać o ważnych osobach i chwilach."
      : nextEvent
      ? `Nadchodzące: ${nextEvent.title}`
      : "Nie masz dziś żadnych wydarzeń";

  return (
    <div>
      {/* ── ASSISTANT CARD ── */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "16px",
          marginBottom: "10px",
        }}
      >
        {/* orb + greeting row */}
        <div style={{ display: "flex", alignItems: "center", gap: "13px", marginBottom: "13px" }}>
          <AssistantOrb speaking={speaking} urgent={isUrgent} onClick={handleSpeak} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginBottom: "3px",
              }}
            >
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: isUrgent ? "#e24b4a" : "#3a9bd5",
                  animation: "hdDot 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: ".09em",
                  color: isUrgent ? "#e24b4a" : "#3a9bd5",
                  textTransform: "uppercase",
                }}
              >
                {isUrgent ? "Uwaga — pilne" : "HappyDate AI"}
              </span>
            </div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "var(--color-text-primary)",
                lineHeight: 1.3,
                margin: "0 0 2px",
              }}
            >
              {greetingText}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {subText}
            </p>
          </div>
        </div>

        {/* ── EVENT AREA ── */}
        {isUrgent && nextEvent ? (
          <UrgentBanner
            title={nextEvent.title}
            personName={nextEvent.person_name}
            daysUntil={daysUntilEvent}
          />
        ) : !isGuest && nextEvent ? (
          <EventPill
            title={nextEvent.title}
            personName={nextEvent.person_name}
            relation={nextEvent.relation}
            daysUntil={daysUntilEvent}
          />
        ) : null}

        {/* ── LISTEN BUTTON ── */}
        <button
          onClick={handleSpeak}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "11px",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-primary)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            marginBottom: "10px",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.55 }}
          >
            {speaking ? (
              <>
                <line x1="6" y1="4" x2="6" y2="20" />
                <line x1="18" y1="4" x2="18" y2="20" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </>
            )}
          </svg>
          {speaking ? "Zatrzymaj" : isGuest ? "Posłuchaj wprowadzenia" : "Posłuchaj podsumowania"}
        </button>

        {/* ── ACTION BUTTONS ── */}
        {isGuest ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={handleSpeak}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "6px", padding: "12px 6px", borderRadius: "var(--border-radius-md)",
                background: "#3a9bd5", border: "none", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "16px" }}>🎤</span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#fff" }}>Powiedz coś</span>
            </button>
            <Link
              href="/auth/login"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "6px", padding: "12px 6px", borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "16px" }}>👉</span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-primary)" }}>Zacznij</span>
            </Link>
          </div>
        ) : isUrgent ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Link
              href="/services"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "6px", padding: "12px 6px", borderRadius: "var(--border-radius-md)",
                background: "#e24b4a", border: "none", textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "16px" }}>🔥</span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#fff", textAlign: "center", lineHeight: 1.2 }}>Szybkie rozwiązanie</span>
            </Link>
            <Link
              href="/services"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "6px", padding: "12px 6px", borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)", textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "16px" }}>🎁</span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-primary)", textAlign: "center", lineHeight: 1.2 }}>Pomysł prezentu</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { icon: "🎁", label: "Pomysł prezentu", href: "/services" },
              { icon: "✍️", label: "Napisz wiadomość", href: "/services" },
              { icon: "📦", label: "Zamów prezent", href: "/services" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "6px", padding: "12px 4px", borderRadius: "var(--border-radius-md)",
                  background: "var(--color-background-secondary)",
                  border: "0.5px solid var(--color-border-tertiary)", textDecoration: "none",
                }}
              >
                <span style={{ fontSize: "16px" }}>{a.icon}</span>
                <span style={{
                  fontSize: "10px", fontWeight: 500,
                  color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.2,
                }}>{a.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── SUGGESTION ── */}
      <SuggestionCard text={getSuggestion(state, firstName)} />

      <style>{`
        @keyframes hdDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .3; transform: scale(.7); }
        }
      `}</style>
    </div>
  );
}