import "server-only";
import { createClient } from "@supabase/supabase-js";
import { buildShownIdeaRows, type ShownGiftIdea, type ShownGiftIdeaInput } from "./shownGiftIdeas";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Owner-scoped, newest first. Returns [] on any failure: memory must never block a reply. */
export async function listShownGiftIdeas(input: { userId: string; personId: string; limit?: number }): Promise<ShownGiftIdea[]> {
  try {
    const { data, error } = await adminClient().from("happy_shown_ideas")
      .select("title,why,source,occasion,estimated_price,currency,offer_url,created_at")
      .eq("user_id", input.userId).eq("person_id", input.personId)
      .order("created_at", { ascending: false }).limit(input.limit ?? 30);
    if (error || !data) return [];
    return data.map((row) => ({
      title: row.title, why: row.why, source: row.source, occasion: row.occasion,
      estimatedPrice: row.estimated_price === null ? null : Number(row.estimated_price),
      currency: row.currency, offerUrl: row.offer_url, shownAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/** Idempotent per (user, person, normalized title). Best effort. */
export async function recordShownGiftIdeas(input: {
  userId: string;
  personId: string;
  source: "page" | "chat";
  occasion: string | null;
  ideas: readonly ShownGiftIdeaInput[];
}): Promise<void> {
  const rows = buildShownIdeaRows(input);
  if (!rows.length) return;
  try {
    await adminClient().from("happy_shown_ideas").upsert(rows, { onConflict: "user_id,person_id,title_key", ignoreDuplicates: true });
  } catch {
    // Remembering is best effort and must never fail the user's request.
  }
}
