import { occasionCheckpointForPhase, type OccasionCheckpoint } from "./proactivity-policy.ts";

export type OccasionPhase = "planning" | "preparing" | "urgent" | "today";
export type OccasionReadinessKind = "needs_action" | "in_progress" | "ready";
export const OCCASION_LEAD_TIME_PRESETS = [7, 14, 21, 30] as const;
export type OccasionLeadTimeDays = (typeof OCCASION_LEAD_TIME_PRESETS)[number];

export function normalizeOccasionLeadTime(value: unknown): OccasionLeadTimeDays {
  return OCCASION_LEAD_TIME_PRESETS.includes(value as OccasionLeadTimeDays) ? value as OccasionLeadTimeDays : 7;
}

export function getEarlierLeadTimeProposal(current: unknown): OccasionLeadTimeDays | null {
  const index = OCCASION_LEAD_TIME_PRESETS.indexOf(normalizeOccasionLeadTime(current));
  return OCCASION_LEAD_TIME_PRESETS[index + 1] ?? null;
}

/** The single planning-window policy used by Home and the proactive Edge path. */
export function resolveOccasionPhase(daysUntil: number, leadTimeDays: unknown = 7): OccasionPhase | null {
  if (!Number.isInteger(daysUntil)) return null;
  const planningStart = normalizeOccasionLeadTime(leadTimeDays);
  if (daysUntil >= 4 && daysUntil <= planningStart) return "planning";
  if (daysUntil >= 2 && daysUntil <= 3) return "preparing";
  if (daysUntil === 1) return "urgent";
  if (daysUntil === 0) return "today";
  return null;
}

export function resolvePlBoysDay(localDay: string, leadTimeDays: unknown = 7): { occasionKey: "pl_boys_day"; occurrenceKey: string; phase: OccasionPhase; daysUntil: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay)) return null;
  const [year, month, day] = localDay.split("-").map(Number);
  const birthday = Date.UTC(year, 8, 30);
  const today = Date.UTC(year, month - 1, day);
  let targetYear = year;
  let target = birthday;
  if (target < today) { targetYear += 1; target = Date.UTC(targetYear, 8, 30); }
  const daysUntil = Math.round((target - today) / 86_400_000);
  const phase = resolveOccasionPhase(daysUntil, leadTimeDays);
  return phase ? { occasionKey: "pl_boys_day", occurrenceKey: `occasion:pl_boys_day:${targetYear}`, phase, daysUntil } : null;
}

/** D+1 is a semantic checkpoint, deliberately outside the pre-event phase enum. */
export function resolvePostEventEligibility(input: {
  localDay: string;
  occasionDate: string;
  personId: string | null;
  existingOutcome: boolean;
}): boolean {
  if (!input.personId || input.existingOutcome || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDay) || !/^\d{4}-\d{2}-\d{2}$/.test(input.occasionDate)) return false;
  const next = new Date(`${input.occasionDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return input.localDay === next.toISOString().slice(0, 10);
}

export function checkpointForOccasionPhase(phase: OccasionPhase): OccasionCheckpoint {
  const checkpoint = occasionCheckpointForPhase(phase);
  if (!checkpoint) throw new TypeError("Invalid Occasion phase");
  return checkpoint;
}

export function resolveOccasionReadiness(input: { giftReady: boolean; greetingReady: boolean; preparationStatus: "not_started" | "in_progress" | "completed" }): { kind: OccasionReadinessKind; missing: readonly ("gift" | "greeting" | "preparation")[] } | { kind: "ready" } {
  const missing: ("gift" | "greeting" | "preparation")[] = [];
  if (!input.giftReady) missing.push("gift");
  if (!input.greetingReady) missing.push("greeting");
  if (input.preparationStatus !== "completed") missing.push("preparation");
  if (missing.length === 0) return { kind: "ready" };
  return { kind: input.preparationStatus === "in_progress" ? "in_progress" : "needs_action", missing };
}

export function isOccasionRescueEligible(input: { phase: OccasionPhase | null; personId: string | null; recipientResolution: "resolved" | "selection_required" | "none"; readiness: OccasionReadinessKind }): boolean {
  return input.recipientResolution === "resolved" && Boolean(input.personId) && (input.phase === "urgent" || input.phase === "today") && input.readiness !== "ready";
}
