import type { HappyDateMode } from "../types";
import type { HappyMemory } from "../memory";

export interface HappyContext {
  firstName?: string;
  mode: HappyDateMode;

  locale: string;
  timezone: string;

  now: Date;

  memory: HappyMemory;
}
