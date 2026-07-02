// src/lib/repositories/memoryRepository.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data Layer for Brain — Memory Repository.
// Read-only access to the `public.memories` table. No business logic,
// no aggregation, no scoring — that belongs to Brain/services, not here.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";
import { mapMemory } from "@/lib/brain/mappers/mapMemory";
import type { BrainMemory } from "@/lib/brain/types";
import type { MemoryRow } from "./memory.types";

/**
 * Fetch every memory record linked to a given person, regardless of
 * type or active status. Ordered by most recently created first.
 */
export async function getMemoriesForPerson(
  personId: string
): Promise<MemoryRow[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw new Error(`[memoryRepository] getMemoriesForPerson failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch all currently active memory records for a given user
 * (across all people/events), regardless of type. Ordered by most
 * recently created first.
 */
export async function getActiveMemories(
  userId: string
): Promise<MemoryRow[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<MemoryRow[]>();

  if (error) {
    throw new Error(`[memoryRepository] getActiveMemories failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch active memories already mapped to the Brain model.
 */
export async function getBrainMemories(
  userId: string
): Promise<BrainMemory[]> {
  const rows = await getActiveMemories(userId);

  return rows.map(mapMemory);
}