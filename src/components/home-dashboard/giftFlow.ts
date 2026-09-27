export type GiftFlowState = "status" | "prepared" | "prepared_done" | "supplementary_handoff" | "save_prompt" | "input" | "saved" | "suggestion" | "declined" | "done" | "assistant_handoff";

const transitions: Record<GiftFlowState, readonly GiftFlowState[]> = {
  status: ["prepared", "save_prompt", "suggestion"],
  prepared: ["prepared_done", "supplementary_handoff"],
  prepared_done: [],
  supplementary_handoff: [],
  save_prompt: ["input", "done"],
  input: ["saved", "done"],
  suggestion: ["declined", "assistant_handoff"],
  saved: [],
  declined: [],
  done: [],
  assistant_handoff: [],
};

export function transitionGiftFlow(state: GiftFlowState, next: GiftFlowState): GiftFlowState {
  return transitions[state].includes(next) ? next : state;
}
