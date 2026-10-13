export const PROACTIVITY_MODES = ["minimal", "balanced", "active"] as const;
export type ProactivityMode = (typeof PROACTIVITY_MODES)[number];
export type ProactiveSignal = "gift_missing" | "prepare_greeting" | "gift_help" | "start_gift_planning";

export const REQUIRED_MODE: Record<ProactiveSignal, ProactivityMode> = {
  gift_missing: "minimal",
  prepare_greeting: "minimal",
  gift_help: "balanced",
  start_gift_planning: "active",
};

export function normalizeProactivityMode(value: unknown): ProactivityMode {
  return value === "minimal" || value === "active" || value === "balanced" ? value : "balanced";
}

export function isSignalAllowedByMode(mode: ProactivityMode, signal: ProactiveSignal): boolean {
  const rank = { minimal: 0, balanced: 1, active: 2 } as const;
  return rank[mode] >= rank[REQUIRED_MODE[signal]];
}

export type QuietDisposition = "later" | "dismissed";

export function proactiveQuietKey(input: { userId: string; eventId: string; occurrenceDate: string; signal: ProactiveSignal }): string {
  return input.signal === "gift_missing"
    ? `birthday:gift_missing:${input.userId}:${input.eventId}:${input.occurrenceDate}`
    : `birthday:${input.signal}:${input.eventId}:${input.occurrenceDate}`;
}

export function evaluateProactiveEligibility(input: {
  mode: ProactivityMode;
  signal: ProactiveSignal;
  quiet: boolean;
}): { eligible: boolean; reason: "eligible" | "mode_blocked" | "quiet_same_milestone" } {
  if (!isSignalAllowedByMode(input.mode, input.signal)) return { eligible: false, reason: "mode_blocked" };
  if (input.quiet) return { eligible: false, reason: "quiet_same_milestone" };
  return { eligible: true, reason: "eligible" };
}
