import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHappyTaskFromTemplate, type CreateHappyTaskResult } from "./happyTaskEngine.server";

export type CreateBirthdayPreparationForEventResult = CreateHappyTaskResult | {
  kind: "not_found" | "invalid_target" | "data_unavailable";
};

/**
 * The browser supplies only an Event id. This server boundary obtains the
 * owner and person from an RLS-scoped Event before using the internal engine.
 */
export async function createBirthdayPreparationForEvent(input: {
  client: SupabaseClient;
  verifiedUserId: string;
  eventId: string;
}): Promise<CreateBirthdayPreparationForEventResult> {
  const { data, error } = await input.client
    .from("events")
    .select("id,user_id,person_id,category")
    .eq("id", input.eventId)
    .eq("user_id", input.verifiedUserId)
    .maybeSingle();
  if (error) return { kind: "data_unavailable" };
  if (!data) return { kind: "not_found" };
  if (data.category?.trim().toLocaleLowerCase() !== "birthday" || typeof data.person_id !== "string") {
    return { kind: "invalid_target" };
  }
  return createHappyTaskFromTemplate({
    verifiedUserId: input.verifiedUserId,
    type: "birthday_preparation",
    personId: data.person_id,
    eventId: data.id,
  });
}
