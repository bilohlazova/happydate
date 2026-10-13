import type { SupabaseClient } from "@supabase/supabase-js";
import type { CountryCode } from "./occasion.types.ts";

export async function getOccasionCountry(client: SupabaseClient, userId: string): Promise<CountryCode | null> {
  const { data, error } = await client.from("happy_occasion_preferences").select("country_code").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("occasion_country_unavailable");
  return data?.country_code === "PL" ? "PL" : null;
}

export async function saveOccasionCountry(client: SupabaseClient, userId: string, countryCode: CountryCode | null): Promise<CountryCode | null> {
  const { data, error } = await client.from("happy_occasion_preferences")
    .upsert({ user_id: userId, country_code: countryCode, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("country_code").single();
  if (error) throw new Error("occasion_country_unavailable");
  return data?.country_code === "PL" ? "PL" : null;
}
