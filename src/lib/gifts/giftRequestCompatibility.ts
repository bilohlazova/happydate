import { supabase } from "../supabaseClient.ts";

export interface LegacyGiftRequestInput {
  event_id: string | null;
  event_title: string;
  event_date: string | null;
  for_whom: string;
  gender: string | null;
  age: string | null;
  interests: string | null;
  occasion: string | null;
  budget_pln: number;
  anonymity: boolean;
  split_payment: boolean;
  delivery: "kurier" | "paczkomat" | "osobiscie";
  notes: string | null;
}

/** Keeps the existing concierge submission working outside the React workspace. */
export async function submitLegacyGiftRequest(input: LegacyGiftRequestInput) {
  const { data } = await supabase.auth.getUser();
  const payload = {
    ...input,
    user_id: data.user?.id ?? null,
    status: "new" as const,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("gift_requests").insert([payload]);
  if (error) return { ok: false as const, error: error.message };

  try {
    await fetch("/api/notify-gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    // Notification remains best-effort, matching the existing flow.
  }
  return { ok: true as const };
}
