"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import MoodCard from "./MoodCard";
import type { HappyDateMode } from "@/lib/happy";
import { MobileUI } from "@/lib/theme/mobile";

export type { HappyDateMode };

interface MoodSelectorProps {
  onChange?: (mode: HappyDateMode) => void;
}

const MODES = [
  {
    id: "energy",
    icon: "😊",
  },
  {
    id: "quick",
    icon: "☕",
  },
  {
    id: "calm",
    icon: "💙",
  },
  {
    id: "surprise",
    icon: "🎉",
  },
] as const;

export default function MoodSelector({
  onChange,
}: MoodSelectorProps) {
  const t = useTranslations("home.legacyMood");
  const [selected, setSelected] =
    useState<HappyDateMode>("quick");

  function handleSelect(mode: HappyDateMode) {
    setSelected(mode);
    onChange?.(mode);
  }

  return (
    <section className={MobileUI.compactSpacing}>
      <div>
        <h2 className={`${MobileUI.sectionTitle} font-bold text-gray-900`}>
          {t("title")}
        </h2>
      </div>

      <div className={MobileUI.cardSpacing}>
        {MODES.map((mode) => (
          <MoodCard
            key={mode.id}
            icon={mode.icon}
            title={t(`${mode.id}.title`)}
            subtitle={t(`${mode.id}.subtitle`)}
            selected={selected === mode.id}
            onClick={() => handleSelect(mode.id)}
          />
        ))}
      </div>
    </section>
  );
}
