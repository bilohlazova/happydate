import { type AppLocale } from "@/i18n/config";
import { supabase } from "@/lib/supabaseClient";
import { buildPreferredLocaleUpdate, parsePreferredLocale } from "./profile.types";

export class ProfileLocaleError extends Error {
  constructor() {
    super("Profile locale operation failed");
    this.name = "ProfileLocaleError";
  }
}

export async function getPreferredLocaleForUser(userId: string): Promise<AppLocale | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new ProfileLocaleError();
  return parsePreferredLocale(data?.preferred_locale);
}

export async function getCurrentUserPreferredLocale(): Promise<AppLocale | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ProfileLocaleError();
  return getPreferredLocaleForUser(data.user.id);
}

export async function updateCurrentUserPreferredLocale(locale: AppLocale): Promise<void> {
  const payload = buildPreferredLocaleUpdate(locale);
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) throw new ProfileLocaleError();

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", data.user.id);
  if (error) throw new ProfileLocaleError();
}
