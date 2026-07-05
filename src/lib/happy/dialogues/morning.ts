import type { DialogueLine, HappyDateMode } from "../types";

export function createMorningDialogue(
  mode: HappyDateMode,
  firstName: string
): DialogueLine[] {
  switch (mode) {
    case "energy":
      return [
        {
          id: "morning-energy-0",
          text: `Dzień dobry, ${firstName}! ☀️`,
        },
        {
          id: "morning-energy-1",
          text: "Zapowiada się dobry dzień.",
        },
        {
          id: "morning-energy-2",
          text: "Jestem gotowy pomóc Ci zadbać o ważne osoby.",
        },
      ];

    case "quick":
      return [
        {
          id: "morning-quick-0",
          text: "Dzień dobry.",
        },
        {
          id: "morning-quick-1",
          text: "Masz dziś 2 ważne wydarzenia.",
        },
        {
          id: "morning-quick-2",
          text: "Jedno z nich wymaga przygotowania prezentu.",
        },
      ];

    case "calm":
      return [
        {
          id: "morning-calm-0",
          text: `Dzień dobry, ${firstName}.`,
        },
        {
          id: "morning-calm-1",
          text: "Przygotowałem spokojne podsumowanie dnia.",
        },
        {
          id: "morning-calm-2",
          text: "Przejdziemy przez wszystko krok po kroku.",
        },
      ];

    case "surprise":
      return [
        {
          id: "morning-surprise-0",
          text: "Dzień dobry 😊",
        },
        {
          id: "morning-surprise-1",
          text: "Mam dziś dla Ciebie małą niespodziankę.",
        },
        {
          id: "morning-surprise-2",
          text: "Zaczynajmy.",
        },
      ];
  }
}
