export const HAPPY_TASK_DECISION_KINDS = ["avoid_gift_theme"] as const;
export type HappyTaskDecisionKind = (typeof HAPPY_TASK_DECISION_KINDS)[number];

export type BirthdayTaskDecision = {
  kind: "avoid_gift_theme";
  value: string;
};

export type ActiveTaskDecisions = {
  avoidGiftThemes: string[];
};

/** Keeps a readable original value while providing conservative semantic dedupe. */
export function normalizeTaskDecisionValue(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function emptyActiveTaskDecisions(): ActiveTaskDecisions {
  return { avoidGiftThemes: [] };
}

export function projectActiveTaskDecisions(rows: readonly BirthdayTaskDecision[]): ActiveTaskDecisions {
  const avoidGiftThemes: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.kind !== "avoid_gift_theme") continue;
    const normalized = normalizeTaskDecisionValue(row.value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    avoidGiftThemes.push(row.value);
  }
  return { avoidGiftThemes };
}
