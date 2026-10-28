type Environment = Record<string, string | undefined>;

export const STAGING_SUPABASE_HOST = "xgelazzdgluuenqkymox.supabase.co";
const PRODUCTION_SUPABASE_HOST = "yzcvdspiiiaidsdripxr.supabase.co";

function invalid(name: string, category: string): never {
  throw new Error(`${name}: ${category}`);
}

function parseUrl(value: string): URL {
  try { return new URL(value); }
  catch { return invalid("NEXT_PUBLIC_SUPABASE_URL", "invalid_url"); }
}

/** Explicit empty publishable values disable config; only absence allows anon fallback. */
export function effectivePublicKey(env: {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}): string | undefined {
  return (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
}

function claims(key: string): { role?: string; ref?: string } | null {
  try {
    return JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

/** Configuration checks only: never contact providers or include values in errors. */
export function assertPublicKeySafe(key: string, url?: string, name = "NEXT_PUBLIC_SUPABASE_KEY"): void {
  key = key.trim();
  if (/^(sb_secret_|sk-|rk_live_|sk_live_|gh[pousr]_|github_pat_|AKIA|ASIA)/.test(key)
    || /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(key)) invalid(name, "privileged_credential");
  const jwt = claims(key);
  if (jwt && jwt.role !== "anon") invalid(name, "unsafe_jwt_role");
  if (jwt?.ref && url && parseUrl(url).hostname !== `${jwt.ref}.supabase.co`) {
    invalid(name, "supabase_project_mismatch");
  }
}

export function assertEnvironmentSafety(env: Environment): void {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && value) assertPublicKeySafe(value, name.includes("SUPABASE") ? url : undefined, name);
  }
  const parsed = url ? parseUrl(url) : undefined;
  if (env.VERCEL_ENV === "production" && parsed) {
    if (parsed.protocol !== "https:" || parsed.hostname !== PRODUCTION_SUPABASE_HOST
      || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port
      || parsed.pathname !== "/") invalid("NEXT_PUBLIC_SUPABASE_URL", "invalid_production_endpoint");
  }
  if (env.VERCEL_ENV !== "preview") return;
  if (!parsed || parsed.protocol !== "https:" || parsed.hostname !== STAGING_SUPABASE_HOST
    || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port
    || parsed.pathname !== "/" || !new RegExp(`^https://${STAGING_SUPABASE_HOST.replaceAll(".", "\\.")}/?$`).test(url!)) {
    invalid("NEXT_PUBLIC_SUPABASE_URL", "invalid_preview_endpoint");
  }
  const key = effectivePublicKey(env);
  // Opaque keys cannot prove project identity offline. Require a matching anon JWT.
  const jwt = key ? claims(key) : null;
  if (jwt?.role !== "anon" || jwt.ref !== "xgelazzdgluuenqkymox") {
    invalid("NEXT_PUBLIC_SUPABASE_KEY", "preview_requires_staging_anon");
  }
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "REPLICATE_API_TOKEN"]) {
    if (env[name]?.trim()) invalid(name, "preview_integration_must_be_disabled");
  }
}
