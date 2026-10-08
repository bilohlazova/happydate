import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatScopeInput } from "./chatScope.contract";

export type { ChatScopeInput } from "./chatScope.contract";

export type VerifiedChatScope =
  | { type: "global"; userId: string }
  | { type: "person"; userId: string; personId: string }
  | { type: "event"; userId: string; eventId: string; personId: string | null }
  | { type: "task"; userId: string; taskId: string; personId: string | null; eventId: string | null; taskType: string };

export class ChatScopeNotFoundError extends Error {}

async function ownedPerson(client: SupabaseClient, userId: string, personId: string) {
  const { data, error } = await client.from("people").select("id").eq("id", personId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ChatScopeNotFoundError();
  return data.id;
}

async function ownedEvent(client: SupabaseClient, userId: string, eventId: string) {
  const { data, error } = await client.from("events").select("id,person_id").eq("id", eventId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ChatScopeNotFoundError();
  if (data.person_id) await ownedPerson(client, userId, data.person_id);
  return { eventId: data.id, personId: data.person_id ?? null };
}

/** Server-only ownership resolver. It never trusts client-provided derived IDs. */
export async function resolveVerifiedChatScope(input: {
  client: SupabaseClient;
  userId: string;
  scope: ChatScopeInput;
}): Promise<VerifiedChatScope> {
  const { client, userId, scope } = input;
  switch (scope.type) {
    case "global": return { type: "global", userId };
    case "person": return { type: "person", userId, personId: await ownedPerson(client, userId, scope.personId) };
    case "event": {
      const event = await ownedEvent(client, userId, scope.eventId);
      return { type: "event", userId, ...event };
    }
    case "task": {
      const { data, error } = await client.from("happy_tasks").select("id,type,person_id,event_id").eq("id", scope.taskId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) throw new ChatScopeNotFoundError();
      if (data.person_id) await ownedPerson(client, userId, data.person_id);
      if (data.event_id) {
        const event = await ownedEvent(client, userId, data.event_id);
        if (event.personId !== null && event.personId !== data.person_id) throw new ChatScopeNotFoundError();
      }
      return { type: "task", userId, taskId: data.id, personId: data.person_id ?? null, eventId: data.event_id ?? null, taskType: data.type };
    }
  }
}
