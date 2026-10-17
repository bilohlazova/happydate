import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "@/lib/supabase/publicConfig";
import type { ChatScopeInput } from "@/lib/assistant/chatScope.contract";

const PAGE_SIZE = 20;

type NotificationRow = {
  id: string;
  user_id: string;
  person_id: string | null;
  event_id: string | null;
  task_id: string | null;
  type: string;
  title: string;
  message: string | null;
  priority: "silent" | "normal" | "important";
  dedupe_key: string | null;
  read_at: string | null;
  opened_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

export type NotificationDestination = {
  kind: "task" | "event" | "person" | "global_chat";
  href: string;
  scope: ChatScopeInput;
};

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  priority: NotificationRow["priority"];
  createdAt: string;
  readAt: string | null;
  openedAt: string | null;
  destination: NotificationDestination;
};

function admin(): SupabaseClient | null {
  const config = readSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return config && key
    ? createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;
}

const columns = "id,user_id,person_id,event_id,task_id,type,title,message,priority,dedupe_key,read_at,opened_at,dismissed_at,created_at";

async function ownedRow(client: SupabaseClient, userId: string, id: string): Promise<NotificationRow | null> {
  const { data, error } = await client.from("happy_notifications").select(columns).eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as NotificationRow | null;
}

async function resolveDestination(client: SupabaseClient, userId: string, row: NotificationRow): Promise<NotificationDestination> {
  if (row.task_id) {
    const { data } = await client.from("happy_tasks").select("id").eq("id", row.task_id).eq("user_id", userId).maybeSingle();
    if (data) return { kind: "task", href: `/?notificationScope=task&taskId=${encodeURIComponent(data.id)}`, scope: { type: "task", taskId: data.id } };
  }
  if (row.event_id) {
    const { data } = await client.from("events").select("id").eq("id", row.event_id).eq("user_id", userId).maybeSingle();
    if (data) return { kind: "event", href: `/events/${encodeURIComponent(data.id)}`, scope: { type: "event", eventId: data.id } };
  }
  if (row.person_id) {
    const { data } = await client.from("people").select("id").eq("id", row.person_id).eq("user_id", userId).maybeSingle();
    if (data) return { kind: "person", href: `/people/${encodeURIComponent(data.id)}`, scope: { type: "person", personId: data.id } };
  }
  return { kind: "global_chat", href: "/?notificationScope=global", scope: { type: "global" } };
}

function toDto(row: NotificationRow, destination: NotificationDestination): NotificationDto {
  return { id: row.id, type: row.type, title: row.title, message: row.message, priority: row.priority, createdAt: row.created_at, readAt: row.read_at, openedAt: row.opened_at, destination };
}

export async function listHappyNotifications(userId: string, page = 0): Promise<{ items: NotificationDto[]; unreadCount: number; hasMore: boolean }> {
  const client = admin();
  if (!client) throw new Error("notifications_unavailable");
  const safePage = Number.isInteger(page) && page >= 0 ? Math.min(page, 100) : 0;
  const from = safePage * PAGE_SIZE;
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    client.from("happy_notifications").select(columns).eq("user_id", userId).is("dismissed_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + PAGE_SIZE),
    client.from("happy_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("dismissed_at", null).is("read_at", null),
  ]);
  if (error || countError) throw error ?? countError;
  const rows = (data ?? []) as NotificationRow[];
  const items = await Promise.all(rows.slice(0, PAGE_SIZE).map(async (row) => toDto(row, await resolveDestination(client, userId, row))));
  return { items, unreadCount: count ?? 0, hasMore: rows.length > PAGE_SIZE };
}

export async function markHappyNotification(userId: string, id: string, open: boolean): Promise<{ kind: "ok"; notification: NotificationDto } | { kind: "not_found" | "unavailable" | "error" }> {
  const client = admin();
  if (!client) return { kind: "unavailable" };
  try {
    const row = await ownedRow(client, userId, id);
    if (!row) return { kind: "not_found" };
    const patch: { read_at?: string; opened_at?: string } = {};
    const now = new Date().toISOString();
    if (!row.read_at) patch.read_at = now;
    if (open && !row.opened_at) patch.opened_at = now;
    let updated = row;
    if (Object.keys(patch).length) {
      const { data, error } = await client.from("happy_notifications").update(patch).eq("id", id).eq("user_id", userId).select(columns).single();
      if (error) return { kind: "error" };
      updated = data as NotificationRow;
    }
    return { kind: "ok", notification: toDto(updated, await resolveDestination(client, userId, updated)) };
  } catch {
    return { kind: "error" };
  }
}

export { PAGE_SIZE };
