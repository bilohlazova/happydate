"use client";

import { useMemo, useState } from "react";

import HappyDateCharacter from "./HappyDateCharacter";
import DialogueBubble from "./DialogueBubble";
import DialogueTyper, { type DialogueLine } from "./DialogueTyper";
import MoodSelector, { type HappyDateMode } from "./MoodSelector";
import BriefingButton from "./BriefingButton";

import { HOME_GREETING } from "@/lib/dialogues/greetings";
import type { CharacterMood } from "./character/Character.types";

interface HomeHeroProps {
  firstName?: string;
}

export default function HomeHero({ firstName = "Mario" }: HomeHeroProps) {
  const [mode, setMode] = useState<HappyDateMode>("quick");
  const [speaking, setSpeaking] = useState(false);
  const [mood, setMood] = useState<CharacterMood>("happy");

  const greeting = useMemo<DialogueLine[]>(() => {
    return HOME_GREETING.map((line, index) => {
      const lineMood: CharacterMood = index === 0 ? "happy" : "calm";

      return {
        id: `greeting-${index}`,
        text: line.replace("{name}", firstName),
        mood: lineMood,
      };
    });
  }, [firstName]);

  function handleStart() {
    console.log("HappyDate mode:", mode);

    // Тут пізніше запустимо Voice Briefing.
  }

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <div className="flex flex-col items-center">
        <HappyDateCharacter mood={mood} speaking={speaking} />

        <div className="mt-6 w-full">
          <DialogueBubble>
            <DialogueTyper
              lines={greeting}
              onSpeakingChange={setSpeaking}
              onMoodChange={(nextMood) => {
                if (nextMood) {
                  setMood(nextMood);
                }
              }}
            />
          </DialogueBubble>
        </div>
      </div>

      <MoodSelector onChange={setMode} />

      <BriefingButton onClick={handleStart} />
    </section>
  );
}