"use client";

import { useState } from "react";

import HappyDateAvatar from "./HappyDateAvatar";
import MoodSelector, {
  HappyDateMode,
} from "./MoodSelector";
import BriefingButton from "./BriefingButton";

export default function HomeHero() {
  const [mode, setMode] =
    useState<HappyDateMode>("quick");

  function handleStart() {
    console.log("HappyDate mode:", mode);

    // Тут пізніше запустимо голосовий briefing.
  }

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <div className="flex flex-col items-center text-center">
        <HappyDateAvatar />

        <h1 className="mt-6 text-4xl font-bold text-gray-900">
          Dzień dobry, Mario!
        </h1>

        <p className="mt-3 max-w-md text-lg leading-8 text-gray-600">
          Sprawdziłem już Twój dzień.
          <br />
          Wybierz, jak mam przygotować
          dzisiejsze podsumowanie.
        </p>
      </div>

      <MoodSelector
        onChange={setMode}
      />

      <BriefingButton
        onClick={handleStart}
      />
    </section>
  );
}