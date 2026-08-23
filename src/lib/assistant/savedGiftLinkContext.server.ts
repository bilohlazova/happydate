import { createClient } from "@supabase/supabase-js";

export const ASSISTANT_SAVED_GIFT_LINK_LIMIT = 8;

export type AssistantSavedGiftLinkContext = {
  url: string;
  title: string | null;
  merchant: string | null;
  isPreferred: boolean;
  decisionNote: string | null;
};

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function safeHttpsUrl(value: unknown): string | null {
  const bounded = boundedText(value, 2_048);
  if (!bounded) return null;
  try {
    const parsed = new URL(bounded);
    return parsed.protocol === "https:" && parsed.hostname ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

/** Server-only ownership boundary for user-confirmed saved gift options. */
export async function loadAssistantSavedGiftLinkContext({
  userId,
  personId,
}: {
  userId: string;
  personId: string;
}): Promise<AssistantSavedGiftLinkContext[]> {
  const { data, error } = await adminClient()
    .from("gift_links")
    .select("url, title, merchant, is_preferred, decision_note")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("is_preferred", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ASSISTANT_SAVED_GIFT_LINK_LIMIT);
  if (error) return [];

  return (data ?? []).flatMap((row) => {
    const url = safeHttpsUrl(row.url);
    if (!url) return [];
    return [{
      url,
      title: boundedText(row.title, 240),
      merchant: boundedText(row.merchant, 160),
      isPreferred: row.is_preferred === true,
      decisionNote: boundedText(row.decision_note, 500),
    }];
  });
}
