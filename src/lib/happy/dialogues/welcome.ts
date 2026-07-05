import type { DialogueLine } from "../types";

export function createWelcomeDialogue(
  firstName: string
): DialogueLine[] {
  return [
    {
      id: "welcome-0",
      text: `Dzień dobry, ${firstName}! 👋`,
      mood: "happy",
    },
    {
      id: "welcome-1",
      text: "Wybierz dzisiejszy tryb.",
      mood: "calm",
    },
  ];
}
