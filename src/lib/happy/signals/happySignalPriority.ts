import type { HappySignal } from "./happySignal.types.ts";

export interface HappySignalPriorityTuple {
  readonly userAction: number;
  readonly temporal: number;
  readonly workflow: number;
  readonly proximity: number;
  readonly kind: number;
  readonly createdAt: string;
  readonly signalKey: string;
}

const KIND_ORDER = { idea: 1, birthday: 2, occasion: 3, task: 4, pending_approval: 5, rescue: 6 } as const;

function proximity(daysUntil: number | null): number {
  return typeof daysUntil === "number" && Number.isFinite(daysUntil) ? -daysUntil : Number.NEGATIVE_INFINITY;
}

export function getIdeaSignalPriority(signal: Extract<HappySignal, { kind: "idea" }>): "high" | "normal" {
  return signal.ideaType === "prepare_greeting"
    || (signal.ideaType === "gift_help" && signal.daysUntil !== null && signal.daysUntil >= 0 && signal.daysUntil <= 7)
    ? "high"
    : "normal";
}

export function getHappySignalPriorityTuple(signal: HappySignal): HappySignalPriorityTuple {
  switch (signal.kind) {
    case "pending_approval":
      return { userAction: 3, temporal: 0, workflow: 4, proximity: Number.NEGATIVE_INFINITY, kind: KIND_ORDER.pending_approval, createdAt: signal.createdAt, signalKey: signal.signalKey };
    case "task":
      return {
        userAction: signal.status === "waiting_user" ? 3 : 2,
        temporal: 0,
        workflow: signal.status === "waiting_user" ? 3 : signal.status === "active" ? 2 : 1,
        proximity: proximity(signal.daysUntil),
        kind: KIND_ORDER.task,
        createdAt: "",
        signalKey: signal.signalKey,
      };
    case "idea":
      // Existing Home behavior orders ideas by semantic priority, then age/id.
      // Proximity is intentionally not a tie-breaker for ideas: a newer idea
      // must not jump ahead of an older equal-priority suggestion merely
      // because its event is sooner.
      return { userAction: 0, temporal: getIdeaSignalPriority(signal) === "high" ? 1 : 0, workflow: 0, proximity: Number.NEGATIVE_INFINITY, kind: KIND_ORDER.idea, createdAt: signal.createdAt, signalKey: signal.signalKey };
    case "birthday":
      return { userAction: signal.urgency === "critical" ? 2 : 1, temporal: signal.urgency === "critical" ? 4 : 1, workflow: 0, proximity: proximity(signal.daysUntil), kind: KIND_ORDER.birthday, createdAt: "", signalKey: signal.signalKey };
    case "occasion":
      return {
        userAction: signal.recipientResolution === "selection_required" ? 3 : 2,
        temporal: signal.phase === "today" ? 4 : signal.phase === "urgent" ? 3 : signal.phase === "preparing" ? 2 : 1,
        workflow: signal.recipientResolution === "selection_required" ? 2 : 0,
        proximity: proximity(signal.daysUntil),
        kind: KIND_ORDER.occasion,
        createdAt: "",
        signalKey: signal.signalKey,
      };
    case "rescue":
      return { userAction: 4, temporal: 5, workflow: 1, proximity: proximity(signal.daysUntil), kind: KIND_ORDER.rescue, createdAt: "", signalKey: signal.signalKey };
  }
}

function comparePriority(left: HappySignalPriorityTuple, right: HappySignalPriorityTuple): number {
  for (const key of ["userAction", "temporal", "workflow", "proximity", "kind"] as const) {
    if (left[key] !== right[key]) return right[key] - left[key];
  }
  if (left.createdAt !== right.createdAt) return left.createdAt.localeCompare(right.createdAt);
  return left.signalKey.localeCompare(right.signalKey);
}

export function compareHappySignals(left: HappySignal, right: HappySignal): number {
  return comparePriority(getHappySignalPriorityTuple(left), getHappySignalPriorityTuple(right));
}

export function selectPrimaryHappySignal(signals: readonly HappySignal[]): HappySignal | null {
  return signals.slice().sort(compareHappySignals)[0] ?? null;
}
