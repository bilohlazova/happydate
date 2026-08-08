import { supabase } from "@/lib/supabaseClient";
import { getPeople as getCanonicalPeople } from "@/lib/repositories/personRepository";
import { projectPersonSummary } from "./projectPersonSummary";
import type { PersonSummary } from "./people.types";

/**
 * Compatibility projection for the legacy Happy Brain.
 * Persistence belongs exclusively to personRepository; this module must not
 * issue a second `public.people` query or invent a second Person contract.
 */
export async function getPeople(): Promise<PersonSummary[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[people.repository] getUser failed:", userError);
      return [];
    }

    if (!user) {
      console.error("[people.repository] getPeople called without a session");
      return [];
    }

    return (await getCanonicalPeople(user.id)).map(projectPersonSummary);
  } catch (error) {
    console.error("[people.repository] getPeople unexpected failure:", error);
    return [];
  }
}
