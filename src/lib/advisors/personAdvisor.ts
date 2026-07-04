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

  if (memories.length === 0) {
    tips.push({
      id: "first-memory",
      priority: 100,
      icon: "💝",
      title: "HappyDate podpowiada",
      message:
        `Dodaj pierwsze wspomnienie o ${person.name}, aby HappyDate mógł lepiej pomagać.`,
    });
  }

  if (memories.length > 0 && memories.length < 5) {
    tips.push({
      id: "more-memories",
      priority: 90,
      icon: "📝",
      title: "HappyDate podpowiada",
      message:
        "Masz już kilka informacji. Dodaj więcej wspomnień, aby łatwiej wybierać prezenty.",
    });
  }

  return tips.sort(
    (a, b) => b.priority - a.priority
  );
}