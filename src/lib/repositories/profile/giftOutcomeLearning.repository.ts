import { supabase } from "@/lib/supabaseClient";

export class GiftOutcomeLearningPreferenceError extends Error {
  constructor() {
    super("Gift outcome learning preference operation failed");
    this.name = "GiftOutcomeLearningPreferenceError";
  }
}

export async function updateGiftOutcomeLearningEnabled(enabled: boolean): Promise<void> {
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) throw new GiftOutcomeLearningPreferenceError();

  const { error } = await supabase
    .from("profiles")
    .update({ gift_outcome_learning_enabled: enabled })
    .eq("id", data.user.id);
  if (error) throw new GiftOutcomeLearningPreferenceError();
}

export async function loadGiftOutcomeLearningEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("gift_outcome_learning_enabled")
    .eq("id", userId)
    .maybeSingle<{ gift_outcome_learning_enabled: boolean }>();
  if (error) throw new GiftOutcomeLearningPreferenceError();
  return data?.gift_outcome_learning_enabled !== false;
}
