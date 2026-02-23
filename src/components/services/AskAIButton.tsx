"use client";

import React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  title?: string;
};

function openChat() {
  window.dispatchEvent(new CustomEvent("hd:openChat"));
}

export default function AskAIButton({
  children = "Zapytaj AI teraz →",
  className = "",
  variant = "primary",
  title = "Otwórz czat AI",
}: Props) {
  const styles =
    variant === "primary"
      ? "inline-flex items-center rounded-2xl px-6 py-3 font-semibold text-white shadow-lg ring-1 ring-black/5 bg-gradient-to-r from-[#ff4f8b] to-[#ff6e64] transition hover:-translate-y-0.5 hover:shadow-xl"
      : variant === "secondary"
      ? "inline-flex items-center rounded-2xl bg-white/80 backdrop-blur-md px-6 py-3 font-semibold text-neutral-900 shadow-lg border border-white/70 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl"
      : "inline-flex items-center rounded-2xl px-5 py-2 font-medium border bg-white hover:bg-neutral-50";

  return (
    <button type="button" onClick={openChat} className={`${styles} ${className}`} title={title}>
      {children}
    </button>
  );
}
