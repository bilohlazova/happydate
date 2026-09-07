import { OBSERVATION_DISCLAIMER, type PersonMemoryEntry, type RelationshipObservation } from "./types.ts";

const THEMES: Array<{ id: string; pattern: RegExp; summary: Record<"uk" | "en", string> }> = [
  {
    id: "travel",
    pattern: /(подорож|travel|trip|мор[ея]|sea|beach|пляж|podróż|reise|путешеств)/iu,
    summary: {
      uk: "Кілька спогадів торкаються подорожей або моря. Це лише спостереження, не висновок про ваші стосунки.",
      en: "Several memories touch travel or the sea. This is only an observation, not a conclusion about your relationship.",
    },
  },
  {
    id: "home",
    pattern: /(дім|home|хат|уют|dom |home|zuhause|дом)/iu,
    summary: {
      uk: "Кілька спогадів повертаються до дому або спільного побуту. Це лише спостереження.",
      en: "Several memories return to home or everyday life together. This is only an observation.",
    },
  },
  {
    id: "food",
    pattern: /(їжа|кулінар|кава|coffee|food|obiad|еда|kochen|ресторан|restaurant)/iu,
    summary: {
      uk: "Кілька спогадів пов’язані з їжею або спільними смаками. Це лише спостереження.",
      en: "Several memories involve food or shared tastes. This is only an observation.",
    },
  },
  {
    id: "care",
    pattern: /(підтрим|обійм|care|support|любов|love|czuło|забота|fürsorge)/iu,
    summary: {
      uk: "Кілька спогадів говорять про турботу поруч. Це лише спостереження, не оцінка стосунків.",
      en: "Several memories speak of care close by. This is only an observation, not a verdict on the relationship.",
    },
  },
];

/**
 * Softly notices repeated themes across user memories. Never emits a diagnosis,
 * compatibility score, or claim about what the relationship "is".
 */
export function noticeRelationshipConnections(
  memories: readonly PersonMemoryEntry[],
  locale: "uk" | "en" = "en",
): RelationshipObservation[] {
  const userMemories = memories.filter((entry) => entry.authority === "user" && entry.epistemicType !== "interpretation");
  const observations: RelationshipObservation[] = [];
  for (const theme of THEMES) {
    const related = userMemories.filter((entry) => theme.pattern.test(entry.text));
    if (related.length < 2) continue;
    observations.push({
      id: `observation:${theme.id}`,
      theme: theme.id,
      summary: theme.summary[locale],
      relatedEntryIds: related.map((entry) => entry.id),
      disclaimerVersion: OBSERVATION_DISCLAIMER,
    });
  }
  return observations;
}
