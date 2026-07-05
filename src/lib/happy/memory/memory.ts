import type { HappyMemory } from "./memory.types";

export async function getHappyMemory(): Promise<HappyMemory> {
  return {
    visits: 1,
  };
}