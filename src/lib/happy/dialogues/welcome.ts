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
      text: "Sprawdziłem już Twój dzień.",
      mood: "calm",
    },
    {
      id: "welcome-2",
      text: "Wybierz, jak mam przygotować dzisiejsze podsumowanie.",
      mood: "calm",
    },
  ];
}
