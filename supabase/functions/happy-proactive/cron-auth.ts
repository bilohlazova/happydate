// Dedicated shared-secret check for the happy-proactive cron caller.
//
// The secret is a random value that is valid ONLY for this function. It is not
// a Supabase API key, so a leak (pg_net queue, redirect, wrong URL) cannot be
// used to read or write project data. Database access inside the function uses
// the platform-managed admin client, which never leaves the Edge runtime.
//
// Environment binding: the secret has the form `<project-ref>.<token>`. The
// function compares the ref in the secret with the ref of its own project,
// taken from the platform-injected SUPABASE_URL, so a secret that was generated
// for another environment is refused even if someone pastes it here.

export type CronAuthResult = "ok" | "unauthorized" | "misconfigured";

export const CRON_SECRET_PATTERN = /^([a-z]{20})\.[A-Za-z0-9_-]{32,}$/;

export function projectRefFromSupabaseUrl(url: string | undefined): string | null {
  return /^https:\/\/([a-z]{20})\.supabase\.co\/?$/.exec(url ?? "")?.[1] ?? null;
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function verifyCronAuthorization(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
  projectRef: string | null,
): Promise<CronAuthResult> {
  const secretRef = CRON_SECRET_PATTERN.exec(expectedSecret ?? "")?.[1];
  if (!expectedSecret || !secretRef || !projectRef || secretRef !== projectRef) return "misconfigured";

  const presented = /^Bearer (\S+)$/.exec(authorizationHeader ?? "")?.[1] ?? "";
  // Compare fixed-length digests so the comparison time does not depend on
  // where the values differ or on their length.
  const [presentedDigest, expectedDigest] = await Promise.all([sha256(presented), sha256(expectedSecret)]);
  let difference = presented.length === 0 ? 1 : 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= presentedDigest[index] ^ expectedDigest[index];
  }
  return difference === 0 ? "ok" : "unauthorized";
}
