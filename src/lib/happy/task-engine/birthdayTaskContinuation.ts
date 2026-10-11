import { getHappyTaskTemplate } from "./happyTaskTemplate.ts";

export type DurableBirthdayStep = { id: string; position: number; type: string; status: string; requiresApproval: boolean };
export type BirthdayContinuationDecision =
  | { kind: "deterministic"; step: "analyze_context" | "analyze_gifts" }
  | { kind: "generate_gift_ideas"; step: "generate_gift_ideas" }
  | { kind: "waiting_user"; step: "choose_gift" }
  | { kind: "already_running"; step: "generate_gift_ideas" }
  | { kind: "paused" } | { kind: "terminal" } | { kind: "invalid_state"; reason: string };

const terminal = new Set(["completed", "cancelled", "failed"]);

/** Pure, birthday-template-only continuation state machine. */
export function resolveBirthdayTaskContinuation(input: { type: string; status: string; templateVersion: unknown; steps: readonly DurableBirthdayStep[] }): BirthdayContinuationDecision {
  const template = getHappyTaskTemplate(input.type);
  if (!template || input.templateVersion !== 1) return { kind: "invalid_state", reason: "unsupported_template" };
  if (input.steps.length !== template.steps.length) return { kind: "invalid_state", reason: "invalid_template" };
  const steps = [...input.steps].sort((a, b) => a.position - b.position);
  if (steps.some((step, index) => step.position !== template.steps[index]?.position || step.type !== template.steps[index]?.type || step.requiresApproval !== template.steps[index]?.requiresApproval)) return { kind: "invalid_state", reason: "invalid_template" };
  if (input.status === "paused") return { kind: "paused" };
  if (terminal.has(input.status)) return { kind: "terminal" };
  if (input.status !== "active" && input.status !== "waiting_user") return { kind: "invalid_state", reason: "invalid_task_status" };
  const current = steps.find((step) => step.status !== "completed");
  if (!current) return { kind: "terminal" };
  if (steps.some((step, index) => index < current.position - 1 && step.status !== "completed")) return { kind: "invalid_state", reason: "non_contiguous_steps" };
  if (current.type === "choose_gift" && current.status === "waiting_user" && input.status === "waiting_user") return { kind: "waiting_user", step: "choose_gift" };
  if (current.type === "generate_gift_ideas" && current.status === "active") return { kind: "already_running", step: "generate_gift_ideas" };
  if (current.status !== "pending") return { kind: "invalid_state", reason: "invalid_step_status" };
  if (current.type === "analyze_context" || current.type === "analyze_gifts") return { kind: "deterministic", step: current.type };
  if (current.type === "generate_gift_ideas") return { kind: "generate_gift_ideas", step: current.type };
  if (current.type === "choose_gift") return { kind: "waiting_user", step: "choose_gift" };
  return { kind: "invalid_state", reason: "future_boundary" };
}
