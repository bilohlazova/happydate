import { createMorningDialogue } from "../dialogues";
import type { HappyDateMode } from "../types";
import type { HappyResponse } from "./responses";

export function createMorningBriefing(
  mode: HappyDateMode,
  firstName: string
): HappyResponse {
  return {
    dialogue: createMorningDialogue(mode, firstName),
  };
}
