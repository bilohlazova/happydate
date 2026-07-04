// src/lib/advisors/personAdvisor.ts

import type { MemoryRow } from "@/lib/repositories/memory.types";
import type { PersonRow } from "@/lib/repositories/person.types";

export interface AdvisorTip {
  id: string;
  priority: number;
  icon: string;
  title: string;
  message: string;
}

export function getPersonAdvisorTips(
  person: PersonRow,
  memories: MemoryRow[]
): AdvisorTip[] {
  const tips: AdvisorTip[] = [];

  // First memory
  if (memories.length === 0) {
    tips.push({
      id: "first-memory",
      priority: 100,
      icon: "💝",
      title: `Poznajmy lepiej ${person.name}`,
      message: `Dodaj pierwsze wspomnienie o ${person.name}. Im więcej HappyDate będzie wiedział o tej osobie, tym trafniejsze będą przypomnienia i propozycje prezentów.`,
    });
  }

  // Only a few memories
  if (memories.length > 0 && memories.length < 5) {
    tips.push({
      id: "more-memories",
      priority: 90,
      icon: "📝",
      title: `Coraz lepiej znamy ${person.name}`,
      message:
        "Masz już kilka zapisanych informacji. Dodaj jeszcze kilka wspomnień, aby HappyDate mógł lepiej dopasowywać prezenty i przypominać o ważnych szczegółach.",
    });
  }

  // Missing favourite flowers
  if (
    !memories.some(
      (memory) =>
        memory.type === "flower" && memory.is_active
    )
  ) {
    tips.push({
      id: "flowers",
      priority: 70,
      icon: "🌷",
      title: "Brakuje ulubionych kwiatów",
      message:
        "Znajomość ulubionych kwiatów często pomaga uratować prezent na ostatnią chwilę.",
    });
  }

  // Missing favourite restaurant
  if (
    !memories.some(
      (memory) =>
        memory.type === "restaurant" && memory.is_active
    )
  ) {
    tips.push({
      id: "restaurant",
      priority: 60,
      icon: "🍽️",
      title: "Nie znamy jeszcze ulubionej restauracji",
      message:
        "Może następnym razem zapytasz o miejsce, do którego ta osoba najchętniej wraca?",
    });
  }

  // Missing hobby
  if (
    !memories.some(
      (memory) =>
        memory.type === "hobby" && memory.is_active
    )
  ) {
    tips.push({
      id: "hobby",
      priority: 50,
      icon: "🎨",
      title: "Co lubi robić w wolnym czasie?",
      message:
        "Informacja o hobby pozwala proponować bardziej osobiste i trafione prezenty.",
    });
  }

  return tips.sort(
    (a, b) => b.priority - a.priority
  );
}