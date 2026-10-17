import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import { proactiveQuietKey, type QuietDisposition, type ProactiveSignal } from "../../../../supabase/functions/happy-proactive/proactivity-policy.ts";

function admin(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && key ? createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null;
}

export type QuietResult = { kind: "ok"; disposition: QuietDisposition; idempotent: boolean } | { kind: "not_found" | "conflict" | "unavailable" | "error" };

async function persistQuiet(client: SupabaseClient, userId: string, quietKey: string, disposition: QuietDisposition): Promise<QuietResult> {
  const previous = await client.from("happy_proactive_quiet").select("disposition").eq("user_id", userId).eq("quiet_key", quietKey).maybeSingle();
  if (previous.error) return { kind: "error" };
  const finalDisposition: QuietDisposition = previous.data?.disposition === "dismissed" ? "dismissed" : disposition;
  const { error } = await client.from("happy_proactive_quiet").upsert({ user_id: userId, quiet_key: quietKey, disposition: finalDisposition, updated_at: new Date().toISOString() }, { onConflict: "user_id,quiet_key" });
  if (error) return { kind: "error" };
  return { kind: "ok", disposition: finalDisposition, idempotent: Boolean(previous.data) };
}

export async function quietHappySemanticKey(userId: string, quietKey: string, disposition: QuietDisposition): Promise<QuietResult> {
  const client = admin();
  if (!client || !quietKey.trim()) return { kind: "unavailable" };
  return persistQuiet(client, userId, quietKey, disposition);
}

export async function listQuietKeys(userId: string, keys: readonly string[]): Promise<ReadonlySet<string>> {
  const client = admin();
  if (!client || keys.length === 0) return new Set();
  const { data, error } = await client.from("happy_proactive_quiet").select("quiet_key").eq("user_id", userId).in("quiet_key", keys);
  if (error) throw new Error("proactive_quiet_unavailable");
  return new Set((data ?? []).flatMap((row) => typeof row.quiet_key === "string" ? [row.quiet_key] : []));
}

function parseSignalKey(key: string): { signal: ProactiveSignal; eventId: string; occurrenceDate: string } | null {
  const parts = key.split(":");
  if (parts[0] !== "birthday") return null;
  if (parts[1] === "gift_missing" && parts.length === 5) return { signal: "gift_missing", eventId: parts[3], occurrenceDate: parts[4] };
  if (parts.length === 4 && (parts[1] === "start_gift_planning" || parts[1] === "gift_help" || parts[1] === "prepare_greeting")) return { signal: parts[1], eventId: parts[2], occurrenceDate: parts[3] };
  return null;
}

export async function quietHappyProactiveItem(userId: string, itemId: string, disposition: QuietDisposition): Promise<QuietResult> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  const idea = await client.from("happy_ideas").select("id,user_id,proactive_key,status").eq("id", itemId).eq("user_id", userId).maybeSingle();
  if (idea.error) return { kind: "error" };
  const row = idea.data;
  let quietKey: string;
  if (row?.proactive_key && parseSignalKey(row.proactive_key)) {
    quietKey = row.proactive_key;
  } else {
    const notification = await client.from("happy_notifications").select("id,user_id,dedupe_key,dismissed_at").eq("id", itemId).eq("user_id", userId).maybeSingle();
    if (notification.error) return { kind: "error" };
    if (!notification.data?.dedupe_key || !parseSignalKey(notification.data.dedupe_key)) return { kind: "not_found" };
    quietKey = notification.data.dedupe_key;
  }
  const quietResult = await persistQuiet(client, userId, quietKey, disposition);
  if (quietResult.kind !== "ok") return quietResult;
  if (row?.status === "new" || row?.status === "shown") {
    const { error } = await client.from("happy_ideas").update({ status: "dismissed", responded_at: new Date().toISOString() }).eq("id", itemId).eq("user_id", userId).in("status", ["new", "shown"]);
    if (error) return { kind: "error" };
  }
  if (!row?.proactive_key) {
    const { error } = await client.from("happy_notifications").update({ dismissed_at: new Date().toISOString() }).eq("id", itemId).eq("user_id", userId);
    if (error) return { kind: "error" };
  }
  return quietResult;
}

export { proactiveQuietKey };
