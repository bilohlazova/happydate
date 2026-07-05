import type { HappyContext } from "./context.types";
import type { HappyDateMode } from "../types";
import { getHappyMemory } from "../memory";

interface CreateContextParams {
  firstName?: string;
  mode: HappyDateMode;
}

export async function createHappyContext({
  firstName,
  mode,
}: CreateContextParams): Promise<HappyContext> {
  const memory = await getHappyMemory();

  return {
    firstName,
    mode,

    locale: "pl-PL",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    now: new Date(),

    memory,
  };
}
