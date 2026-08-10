import { supabase } from "@/lib/supabaseClient";
import { exportOwnedKnowledgeRows } from "@/lib/repositories/knowledgeRepository";

const PAGE_SIZE = 500;

async function authenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return data.user;
}

async function exportOwnedRows(
  table: string,
  userId: string,
  columns = "*",
  ownerColumn = "user_id",
): Promise<Record<string, unknown>[]> {
  const result: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(ownerColumn, userId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Export unavailable: ${table}`);
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    result.push(...page);
    if (page.length < PAGE_SIZE) return result;
  }
}

export interface HappyDateAccountExport {
  format: "happydate-account-export";
  version: 1;
  exportedAt: string;
  account: { id: string; email: string | null; createdAt: string | null };
  data: Record<string, unknown[]>;
}

export async function buildHappyDateAccountExport(): Promise<HappyDateAccountExport> {
  const user = await authenticatedUser();
  const [profiles, people, events, memories, gifts, giftLinks, reminders, reminderPreferences, reminderDeliveries, pushDevices, knowledgeChanges, knowledgeReviewInteractions] = await Promise.all([
    exportOwnedRows("profiles", user.id, "id, full_name, phone, preferences, avatar_url, preferred_locale, points, created_at, gift_outcome_learning_enabled", "id"),
    exportOwnedRows("people", user.id),
    exportOwnedRows("events", user.id),
    exportOwnedKnowledgeRows(user.id),
    exportOwnedRows("gifts", user.id),
    exportOwnedRows("gift_links", user.id),
    exportOwnedRows("reminders", user.id),
    exportOwnedRows("reminder_preferences", user.id),
    exportOwnedRows("reminder_deliveries", user.id),
    exportOwnedRows("push_devices", user.id, "id, user_id, platform, locale, enabled, last_seen_at, created_at, updated_at"),
    exportOwnedRows("memory_knowledge_changes", user.id),
    exportOwnedRows("knowledge_review_interactions", user.id),
  ]);
  return {
    format: "happydate-account-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at ?? null },
    data: { profiles, people, events, memories, gifts, giftLinks, reminders, reminderPreferences, reminderDeliveries, pushDevices, knowledgeChanges, knowledgeReviewInteractions },
  };
}

export function downloadHappyDateAccountExport(value: HappyDateAccountExport): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `happydate-export-${value.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
