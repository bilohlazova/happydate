"use client";

import { useState } from "react";

import MoodCard from "./MoodCard";
import type { HappyDateMode } from "@/lib/happy";

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
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Jakiego HappyDate dzisiaj potrzebujesz?
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Wybierz sposób, w jaki chcesz otrzymać
          dzisiejsze podsumowanie.
        </p>
      </div>

      <div className="space-y-3">
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
