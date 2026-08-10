import { supabase } from "@/lib/supabaseClient";

export type KnowledgeReviewInteractionChannel = "home" | "voice" | "profile";
export type KnowledgeReviewInteractionAction = "shown" | "confirmed" | "snoozed" | "archived";

/**
 * Best-effort, content-free first-party measurement. The database deduplicates
 * equal events per UTC day; telemetry must never block a user action.
 */
export async function recordKnowledgeReviewInteraction(
  channel: KnowledgeReviewInteractionChannel,
  action: KnowledgeReviewInteractionAction,
): Promise<void> {
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) return;
    const { error } = await supabase
      .from("knowledge_review_interactions")
      .upsert({ user_id: data.user.id, channel, action }, {
        onConflict: "user_id,occurred_on,channel,action",
        ignoreDuplicates: true,
      });
    if (error) console.warn("[knowledge-review-interaction] Record skipped");
  } catch {
    // Measurement is intentionally non-critical and content-free.
  }
}
