type Environment = Record<string, string | undefined>;

export const STAGING_SUPABASE_HOST = "xgelazzdgluuenqkymox.supabase.co";

function claims(key: string): { role?: string; ref?: string } | null {
  try {
    return JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

/** Configuration checks only: never contact providers or include values in errors. */
export function assertPublicKeySafe(key: string, url?: string): void {
  if (key.startsWith("sb_secret_")) throw new Error("Unsafe public Supabase key");
  const jwt = claims(key);
  if (jwt && jwt.role !== "anon") throw new Error("Unsafe public JWT role");
  if (jwt?.ref && url && new URL(url).hostname !== `${jwt.ref}.supabase.co`) {
    throw new Error("Supabase URL and key project mismatch");
  }
}

export function assertEnvironmentSafety(env: Environment): void {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && value) assertPublicKeySafe(value, name.includes("SUPABASE") ? url : undefined);
  }
  if (env.VERCEL_ENV !== "preview") return;
  if (!url || new URL(url).origin !== `https://${STAGING_SUPABASE_HOST}`) {
    throw new Error("Preview requires the approved Staging Supabase project");
  }
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Opaque keys cannot prove project identity offline. Require a matching anon JWT.
  const jwt = key ? claims(key) : null;
  if (jwt?.role !== "anon" || jwt.ref !== "xgelazzdgluuenqkymox") {
    throw new Error("Preview requires a project-matched Staging anon key");
  }
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "REPLICATE_API_TOKEN"]) {
    if (env[name]?.trim()) throw new Error("Preview external privileged integrations must be disabled");
  }
}
