export const PROACTIVITY_MODES = ["minimal", "balanced", "active"] as const;
export type ProactivityMode = (typeof PROACTIVITY_MODES)[number];
export type ProactiveSignal = "gift_missing" | "prepare_greeting" | "gift_help" | "start_gift_planning";
const REQUIRED_MODE: Record<ProactiveSignal, ProactivityMode> = { gift_missing: "minimal", prepare_greeting: "minimal", gift_help: "balanced", start_gift_planning: "active" };
export function isSignalAllowedByMode(mode: ProactivityMode, signal: ProactiveSignal): boolean {
  const rank = { minimal: 0, balanced: 1, active: 2 } as const;
  return rank[mode] >= rank[REQUIRED_MODE[signal]];
}
