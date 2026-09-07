import { createClient } from "@supabase/supabase-js";
import type { PersonSymbolRow } from "@/lib/repositories/personSymbolRepository";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Server-verified, owner-and-person-scoped symbol semantics for Memory Engine V2. */
export async function loadAssistantPersonSymbol({ userId, personId }: { userId: string; personId: string }): Promise<PersonSymbolRow | null> {
  const { data, error } = await adminClient().from("person_symbols")
    .select("id,user_id,person_id,kind,name,preset_key,image_path,description,prompt,user_meaning,happy_interpretation,interpretation_disclaimer_version,created_at,updated_at")
    .eq("user_id", userId).eq("person_id", personId).maybeSingle();
  if (error || !data) return null;
  return { ...data, image_url: null } as PersonSymbolRow;
}
