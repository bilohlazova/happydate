"use client";

import { useState } from "react";

import HappyDateCharacter from "@/components/character/HappyDateCharacter";

import DialogueBubble from "./DialogueBubble";
import DialogueTyper from "./DialogueTyper";
import MoodSelector from "./MoodSelector";
import BriefingButton from "./BriefingButton";

import {
  createHappyContext,
  createIdleSession,
  createWelcomeDialogue,
  runMorningSession,
} from "@/lib/happy";
import { MobileUI } from "@/lib/theme/mobile";

import type {
  CharacterMood,
  DialogueLine,
  HappyDateMode,
  HappySession,
} from "@/lib/happy";

interface HomeHeroProps {
  firstName?: string;
}

export default function HomeHero({
  firstName = "Mario",
}: HomeHeroProps) {
  const [mode, setMode] =
    useState<HappyDateMode>("quick");

  const [session, setSession] =
    useState<HappySession>(() =>
      createIdleSession("quick")
    );

  const [dialogue, setDialogue] =
    useState<DialogueLine[]>(() =>
      createWelcomeDialogue(firstName)
    );

  const [mood, setMood] =
    useState<CharacterMood>("happy");

  function handleModeChange(
    nextMode: HappyDateMode
  ) {
    setMode(nextMode);

    setSession((currentSession) => {
      if (
        currentSession.state === "thinking" ||
        currentSession.state === "speaking"
      ) {
        return currentSession;
      }

      return createIdleSession(nextMode);
    });
  }

  async function handleStart() {
    if (
      session.state === "thinking" ||
      session.state === "speaking"
    ) {
      return;
    }

    const context = await createHappyContext({
      firstName,
      mode,
    });

    await runMorningSession({
      context,
      onSessionChange: setSession,
      onBriefingReady: (briefing) => {
        setDialogue(briefing.dialogue);
      },
    });
  }

  return (
    <section className={`mx-auto max-w-xl ${MobileUI.spacing}`}>
      <div className="flex flex-col items-center">
        <HappyDateCharacter
          state={session.state}
          mood={mood}
        />

        <div className="mt-2 w-full">
          <DialogueBubble>
            {session.state === "thinking" ? (
              <p
                className={`${MobileUI.sectionTitle} font-semibold text-gray-900`}
              >
                Analizuję Twój dzień...
              </p>
            ) : (
              <DialogueTyper
                lines={dialogue}
                onMoodChange={(nextMood) => {
                  if (nextMood) {
                    setMood(nextMood);
                  }
                }}
                onFinished={() => {
                  setSession((currentSession) => ({
                    state: "finished",
                    mode: currentSession.mode,
                  }));
                }}
              />
            )}
          </DialogueBubble>
        </div>
      </div>

      <MoodSelector
        onChange={handleModeChange}
      />

      <BriefingButton
        disabled={
          session.state === "thinking" ||
          session.state === "speaking"
        }
        onClick={handleStart}
      />
    </section>
  );
}
