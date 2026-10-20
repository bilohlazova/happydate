import { occasionCheckpointForPhase, type OccasionCheckpoint } from "./proactivity-policy.ts";
import { isOccasionRescueEligible } from "./occasion-domain.ts";

export type OccasionBackgroundPhase = "planning" | "preparing" | "urgent" | "today";
export type OccasionBackgroundMode = "minimal" | "balanced" | "active";
export type OccasionArtifactKind = "idea" | "notification";

export type OccasionBackgroundCandidate = {
  userId: string;
  occasionKey: string;
  occurrenceKey: string;
  personId: string | null;
  phase: OccasionBackgroundPhase;
  readiness: "needs_action" | "in_progress" | "ready";
  quiet: boolean;
  mode: OccasionBackgroundMode;
};

export type OccasionBackgroundDecision =
  | { kind: "skip"; reason: "no_person" | "selection_required" | "ready" | "mode_blocked" | "quiet" }
  | { kind: "emit"; artifact: OccasionArtifactKind; milestone: OccasionCheckpoint; dedupeKey: string };

const MODE_RANK: Record<OccasionBackgroundMode, number> = { minimal: 0, balanced: 1, active: 2 };
const REQUIRED_MODE: Record<OccasionCheckpoint, OccasionBackgroundMode> = {
  planning: "active",
  preparing: "balanced",
  urgent: "minimal",
  today: "minimal",
};

export function occasionBackgroundDedupeKey(input: Pick<OccasionBackgroundCandidate, "occasionKey" | "occurrenceKey" | "personId" | "phase">): string {
  if (!input.personId) throw new TypeError("Occasion background requires a resolved person");
  const milestone = occasionCheckpointForPhase(input.phase);
  if (!milestone) throw new TypeError("Invalid Occasion milestone");
  return `occasion:${input.occasionKey}:${input.occurrenceKey.split(":").at(-1)}:${input.personId}:${milestone}`;
}

export function decideOccasionBackground(candidate: OccasionBackgroundCandidate): OccasionBackgroundDecision {
  if (!candidate.personId) return { kind: "skip", reason: "selection_required" };
  if (candidate.readiness === "ready") return { kind: "skip", reason: "ready" };
  if (MODE_RANK[candidate.mode] < MODE_RANK[REQUIRED_MODE[candidate.phase]]) return { kind: "skip", reason: "mode_blocked" };
  if (candidate.quiet) return { kind: "skip", reason: "quiet" };
  const milestone = occasionCheckpointForPhase(candidate.phase);
  if (!milestone) return { kind: "skip", reason: "mode_blocked" };
  return {
    kind: "emit",
    artifact: milestone === "urgent" || milestone === "today"
      ? (isOccasionRescueEligible({ phase: candidate.phase, personId: candidate.personId, recipientResolution: "resolved", readiness: candidate.readiness }) ? "notification" : "idea")
      : "idea",
    milestone,
    dedupeKey: occasionBackgroundDedupeKey(candidate),
  };
}
