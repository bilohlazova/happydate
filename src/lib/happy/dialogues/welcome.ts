import type { DialogueLine } from "../types";

export function createWelcomeDialogue(
  firstName?: string
): DialogueLine[] {
  const greeting = firstName
    ? `Dzień dobry, ${firstName}! 👋`
    : "Dzień dobry! 👋";

  return [
    {
      id: "welcome-0",
      text: greeting,
      mood: "happy",
    },
    {
      id: "welcome-1",
      text: "Wybierz dzisiejszy tryb.",
      mood: "calm",
    },
  ];
}
