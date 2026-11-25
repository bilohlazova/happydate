// Dedicated shared-secret check for the happy-proactive cron caller.
//
// The secret is a random value that is valid ONLY for this function. It is not
// a Supabase API key, so a leak (pg_net queue, redirect, wrong URL) cannot be
// used to read or write project data. Database access inside the function uses
// the platform-managed admin client, which never leaves the Edge runtime.

export type CronAuthResult = "ok" | "unauthorized" | "misconfigured";

export const CRON_SECRET_MIN_LENGTH = 32;

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function verifyCronAuthorization(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): Promise<CronAuthResult> {
  if (!expectedSecret || expectedSecret.length < CRON_SECRET_MIN_LENGTH) return "misconfigured";

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
