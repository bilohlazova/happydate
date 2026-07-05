import { createMorningDialogue } from "../dialogues";
import type { HappyContext } from "../context";
import type { HappyResponse } from "./responses";

export function createMorningBriefing(
  context: HappyContext
): HappyResponse {
  return {
    dialogue: createMorningDialogue(
      context.mode,
      context.firstName
    ),
  };
}