import type { DialogueLine, HappyDateMode } from "../types";

export function createMorningDialogue(
  mode: HappyDateMode,
  firstName: string | undefined,
  cardCount: number,
  memoryTitle?: string
): DialogueLine[] {
  const energeticGreeting = firstName
    ? `Dzień dobry, ${firstName}! ☀️`
    : "Dzień dobry! ☀️";

  const calmGreeting = firstName
    ? `Dzień dobry, ${firstName}.`
    : "Dzień dobry.";

  const quickSummary =
    cardCount > 0
      ? `Znalazłem ${cardCount} ważne ${
          cardCount === 1 ? "przypomnienie" : "przypomnienia"
        }.`
      : "Nie widzę teraz pilnych przypomnień.";

  const quickFollowUp =
    cardCount > 0
      ? "Warto przejrzeć je przed rozpoczęciem dnia."
      : "Możesz spokojnie wrócić do tego później.";

  const memoryLine = memoryTitle
    ? `Przypomniałem sobie coś ważnego: ${memoryTitle}.`
    : null;

  switch (mode) {
    case "energy":
      return [
        {
          id: "morning-energy-0",
          text: energeticGreeting,
        },
        {
          id: "morning-energy-1",
          text: "Zapowiada się dobry dzień.",
        },
        {
          id: "morning-energy-2",
          text:
            memoryLine ??
            "Jestem gotowy pomóc Ci zadbać o ważne osoby.",
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
          text: quickSummary,
        },
        {
          id: "morning-quick-2",
          text: memoryLine ?? quickFollowUp,
        },
      ];

    case "calm":
      return [
        {
          id: "morning-calm-0",
          text: calmGreeting,
        },
        {
          id: "morning-calm-1",
          text: "Przygotowałem spokojne podsumowanie dnia.",
        },
        {
          id: "morning-calm-2",
          text:
            memoryLine ??
            "Przejdziemy przez wszystko krok po kroku.",
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
          text:
            memoryLine ??
            "Mam dziś dla Ciebie małą niespodziankę.",
        },
        {
          id: "morning-surprise-2",
          text: "Zaczynajmy.",
        },
      ];
  }
}
