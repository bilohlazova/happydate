import { supabase } from "@/lib/supabaseClient";
import { logOperationalError } from "@/lib/observability/safeLogger";
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
      logOperationalError("people-repository", "get-user-failed", userError);
      return [];
    }

    if (!user) {
      logOperationalError("people-repository", "missing-session");
      return [];
    }

    return (await getCanonicalPeople(user.id)).map(projectPersonSummary);
  } catch (error) {
    logOperationalError("people-repository", "unexpected-failure", error);
    return [];
  }
}
