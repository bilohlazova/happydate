import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/lib/supabase/publicConfig";

const { url: supabaseUrl, key: supabasePublishableKey } =
  requireSupabasePublicConfig();

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
