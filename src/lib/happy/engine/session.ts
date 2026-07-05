import { createMorningBriefing } from "./briefing";
import type { HappyResponse } from "./responses";
import type { HappyDateMode } from "../types/mode";

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
  mode: HappyDateMode;
  firstName: string;
  onSessionChange: (session: HappySession) => void;
  onBriefingReady: (briefing: HappyResponse) => void;
}

const THINKING_DELAY_MS = 1200;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  mode,
  firstName,
  onSessionChange,
  onBriefingReady,
}: RunMorningSessionParams) {
  onSessionChange({
    state: "thinking",
    mode,
  });

  await wait(THINKING_DELAY_MS);

  const briefing = createMorningBriefing(mode, firstName);

  onBriefingReady(briefing);
  onSessionChange({
    state: "speaking",
    mode,
  });
}
