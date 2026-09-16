export type GiftFlowState = "status" | "save_prompt" | "input" | "saved" | "suggestion" | "declined" | "done" | "assistant_handoff";

const transitions: Record<GiftFlowState, readonly GiftFlowState[]> = {
  status: ["save_prompt", "suggestion"],
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
