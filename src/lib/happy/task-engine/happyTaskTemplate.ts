export type HappyTaskType = "birthday_preparation";
export type BirthdayPreparationStepType = "analyze_context" | "analyze_gifts" | "generate_gift_ideas" | "choose_gift" | "save_gift" | "prepare_greeting";
export type HappyTaskTemplate = { type: HappyTaskType; version: 1; steps: readonly { position: number; type: BirthdayPreparationStepType; title: string; requiresApproval: boolean; waitsForUser: boolean; optional: boolean }[] };

const birthdayPreparation: HappyTaskTemplate = Object.freeze({ type: "birthday_preparation", version: 1, steps: Object.freeze([
  Object.freeze({ position: 1, type: "analyze_context", title: "Review person context", requiresApproval: false, waitsForUser: false, optional: false }),
  Object.freeze({ position: 2, type: "analyze_gifts", title: "Review previous gifts", requiresApproval: false, waitsForUser: false, optional: false }),
  Object.freeze({ position: 3, type: "generate_gift_ideas", title: "Generate gift ideas", requiresApproval: false, waitsForUser: false, optional: false }),
  Object.freeze({ position: 4, type: "choose_gift", title: "Choose a gift", requiresApproval: false, waitsForUser: true, optional: false }),
  Object.freeze({ position: 5, type: "save_gift", title: "Save selected gift", requiresApproval: true, waitsForUser: false, optional: false }),
  Object.freeze({ position: 6, type: "prepare_greeting", title: "Prepare greeting", requiresApproval: false, waitsForUser: false, optional: true }),
]) });
export function getHappyTaskTemplate(type: string): HappyTaskTemplate | null { return type === "birthday_preparation" ? birthdayPreparation : null; }
