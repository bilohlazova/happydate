import { createMorningBriefing } from "./briefing";

import type { HappyContext } from "../context";
import type { HappyResponse } from "./responses";
import type { HappyDateMode } from "../types";

export type HappySessionState =
  | "idle"
  | "thinking"
  | "speaking"
  | "finished";

export interface HappySession {
  state: HappySessionState;
  mode: HappyDateMode;
}

interface RunMorningSessionParams {
  context: HappyContext;

  onSessionChange: (session: HappySession) => void;

  onBriefingReady: (
    briefing: HappyResponse
  ) => void;
}

export function createIdleSession(
  mode: HappyDateMode
): HappySession {
  return {
    state: "idle",
    mode,
  };
}

export async function runMorningSession({
  context,
  onSessionChange,
  onBriefingReady,
}: RunMorningSessionParams) {
  onSessionChange({
    state: "thinking",
    mode: context.mode,
  });

  // Тимчасова затримка.
  // Пізніше тут буде AI, календар, пам'ять,
  // погода, подарунки тощо.
  await new Promise((resolve) =>
    setTimeout(resolve, 1200)
  );

  const briefing =
    createMorningBriefing(context);

  onBriefingReady(briefing);

  onSessionChange({
    state: "speaking",
    mode: context.mode,
  });
}