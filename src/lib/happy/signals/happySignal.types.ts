import type { BirthdayUrgency } from "../../birthday/birthdayPresentation.ts";
import type { OccasionPhase } from "../../occasions/occasion.types.ts";
import type { OccasionPersonCandidate } from "../../occasions/occasionPeople.types.ts";
import type { OccasionReadiness } from "../../occasions/occasionPreparation.ts";

export type HappySignal =
  | PendingApprovalSignal
  | TaskSignal
  | IdeaSignal
  | BirthdaySignal
  | OccasionSignal
  | RescueSignal;

export interface PendingApprovalSignal {
  readonly kind: "pending_approval";
  readonly signalKey: `happy-signal:approval:${string}`;
  readonly actionId: string;
  readonly actionType: string;
  readonly createdAt: string;
}

export interface TaskSignal {
  readonly kind: "task";
  readonly signalKey: `happy-signal:task:${string}`;
  readonly taskId: string;
  readonly status: "waiting_user" | "active" | "paused";
  readonly daysUntil: number;
}

export interface IdeaSignal {
  readonly kind: "idea";
  readonly signalKey: `happy-signal:idea:${string}`;
  readonly ideaId: string;
  readonly ideaType: string;
  readonly daysUntil: number | null;
  readonly createdAt: string;
}

export interface BirthdaySignal {
  readonly kind: "birthday";
  readonly signalKey: `happy-signal:birthday:${string}`;
  readonly occurrenceKey: string;
  readonly eventId: string | null;
  readonly personId: string | null;
  readonly daysUntil: number;
  readonly urgency: BirthdayUrgency;
  readonly giftReady: boolean;
}

export interface OccasionSignal {
  readonly kind: "occasion";
  readonly signalKey: `happy-signal:occasion:${string}`;
  readonly occasionKey: string;
  readonly occurrenceKey: string;
  readonly phase: OccasionPhase;
  readonly recipientResolution: "resolved" | "selection_required";
  readonly personId: string | null;
  readonly candidates: readonly OccasionPersonCandidate[];
  readonly daysUntil: number;
  readonly readiness?: OccasionReadiness;
}

/** Reserved domain contract only. Block 47 does not produce Rescue signals. */
export interface RescueSignal {
  readonly kind: "rescue";
  readonly signalKey: `happy-signal:rescue:${string}`;
  readonly rescueKey: string;
  readonly occasionKey: string;
  readonly occurrenceKey: string;
  readonly personId: string;
  readonly phase: Extract<OccasionPhase, "urgent" | "today">;
  readonly missing: readonly ("gift" | "greeting" | "preparation")[];
  readonly daysUntil: number;
  readonly requiresAction: true;
}
