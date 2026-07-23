"use client";

// src/components/assistant/AssistantActions.tsx
// Кнопки дій — різні для кожного стану
// Принцип: максимум 3 кнопки, завжди конкретні

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AssistantState } from "./types";

interface Action {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
}

interface Props {
  state: AssistantState;
  onSpeak?: () => void;
}

function getActions(
  state: AssistantState,
  t: ReturnType<typeof useTranslations<"assistant.legacyActions">>,
  onSpeak?: () => void
): Action[] {
  switch (state) {
    case "guest":
      return [
        { icon: "🎤", label: t("speak"), onClick: onSpeak, variant: "primary" },
        { icon: "👉", label: t("start"), href: "/auth/login" },
      ];

    case "calm":
      return [
        { icon: "➕", label: t("addEvent"), href: "/calendar" },
        { icon: "👤", label: t("addPerson"), href: "/people" },
      ];

    case "active":
      return [
        { icon: "🎁", label: t("giftIdea"), href: "/services" },
        { icon: "✍️", label: t("writeMessage"), href: "/services" },
        { icon: "📦", label: t("orderGift"), href: "/services" },
      ];

    case "urgent":
      return [
        { icon: "🔥", label: t("quick"), href: "/services", variant: "danger" },
        { icon: "✍️", label: t("writeNow"), href: "/services" },
      ];
  }
}

const COLS: Record<number, string> = {
  1: "1fr",
  2: "1fr 1fr",
  3: "1fr 1fr 1fr",
};

export default function AssistantActions({ state, onSpeak }: Props) {
  const t = useTranslations("assistant.legacyActions");
  const actions = getActions(state, t, onSpeak);
  const cols = COLS[actions.length] ?? "1fr 1fr";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols,
      gap: 8,
    }}>
      {actions.map((a) => {
        const style: React.CSSProperties = {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "12px 6px",
          borderRadius: "var(--border-radius-md)",
          cursor: "pointer",
          textDecoration: "none",
          border: "0.5px solid var(--color-border-tertiary)",
          background:
            a.variant === "primary" ? "#3a9bd5" :
            a.variant === "danger"  ? "#e24b4a" :
            "var(--color-background-secondary)",
          transition: "opacity .15s, transform .15s",
        };

        const labelStyle: React.CSSProperties = {
          fontSize: 10,
          fontWeight: 500,
          lineHeight: 1.25,
          textAlign: "center",
          color:
            a.variant === "primary" || a.variant === "danger"
              ? "#fff"
              : "var(--color-text-secondary)",
        };

        const inner = (
          <>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{a.icon}</span>
            <span style={labelStyle}>{a.label}</span>
          </>
        );

        if (a.href) {
          return (
            <Link key={a.label} href={a.href} style={style}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={a.label}
            onClick={a.onClick}
            style={{ ...style, border: "none" }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
