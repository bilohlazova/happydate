import { createMorningDialogue } from "../dialogues";
import { generateMorningCards } from "../brain";

import type { HappyContext } from "../context";
import type { HappyResponse } from "./responses";

export async function createMorningBriefing(
  context: HappyContext
): Promise<HappyResponse> {
  const cards = await generateMorningCards(context);

  return {
    dialogue: createMorningDialogue(
      context.mode,
      context.firstName
    ),
    cards,
  };
}