"use client";

import { useState } from "react";

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
    title: "Dodaj mi energii",
    subtitle: "Pozytywne rozpoczęcie dnia",
  },
  {
    id: "quick",
    icon: "☕",
    title: "Krótko i konkretnie",
    subtitle: "Najważniejsze informacje w 20 sekund",
  },
  {
    id: "calm",
    icon: "💙",
    title: "Spokojnie",
    subtitle: "Bez pośpiechu i z większą ilością szczegółów",
  },
  {
    id: "surprise",
    icon: "🎉",
    title: "Zaskocz mnie",
    subtitle: "HappyDate sam wybierze najlepszy sposób",
  },
] as const;

export default function MoodSelector({
  onChange,
}: MoodSelectorProps) {
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
          Wybierz tryb
        </h2>
      </div>

      <div className={MobileUI.cardSpacing}>
        {MODES.map((mode) => (
          <MoodCard
            key={mode.id}
            icon={mode.icon}
            title={mode.title}
            subtitle={mode.subtitle}
            selected={selected === mode.id}
            onClick={() => handleSelect(mode.id)}
          />
        ))}
      </div>
    </section>
  );
}
