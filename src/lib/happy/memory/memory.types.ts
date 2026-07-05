import type { HappyDateMode } from "../types";

export interface HappyMemory {
  lastMode?: HappyDateMode;

  lastOpenedAt?: Date;

  visits: number;
}