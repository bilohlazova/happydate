type Environment = Record<string, string | undefined>;
import { VERIFIED_STAGING_PUBLISHABLE_KEYS } from "./verifiedStagingPublishableKeys.ts";

export const STAGING_SUPABASE_HOST = "xgelazzdgluuenqkymox.supabase.co";
const PRODUCTION_SUPABASE_HOST = "yzcvdspiiiaidsdripxr.supabase.co";
export const PR14_BRANCH = "fix/onboarding-survey-safe-ui";
export const PR14_POLICY_MARKER = "pr14-staging-v1";

export type EnvironmentSafetyStatus =
  | "pr14-preview-isolated"
  | "other-preview-unverified"
  | "production-config-checked"
  | "local-unverified"
  | "unknown-context-unverified";

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

/** Universal public-value checks: no secret values in errors, input or cause. */
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

/** Configuration checks only; never contact providers or certify other Preview isolation. */
export function assertEnvironmentSafety(env: Environment): EnvironmentSafetyStatus {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && value) assertPublicKeySafe(value, name.includes("SUPABASE") ? url : undefined, name);
  }
  const parsed = url ? parseUrl(url) : undefined;
  const branch = env.VERCEL_GIT_COMMIT_REF?.trim();
  const marker = env.HAPPYDATE_PREVIEW_POLICY?.trim();
  if (marker && marker !== PR14_POLICY_MARKER) invalid("HAPPYDATE_PREVIEW_POLICY", "unknown_policy");
  if (marker && env.VERCEL_ENV !== "preview") invalid("HAPPYDATE_PREVIEW_POLICY", "preview_context_required");
  if (marker && branch && branch !== PR14_BRANCH) invalid("HAPPYDATE_PREVIEW_POLICY", "branch_context_mismatch");

  if (env.VERCEL_ENV === "production") {
    if (parsed && (parsed.protocol !== "https:" || parsed.hostname !== PRODUCTION_SUPABASE_HOST
      || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port
      || parsed.pathname !== "/")) invalid("NEXT_PUBLIC_SUPABASE_URL", "invalid_production_endpoint");
    return "production-config-checked";
  }

  if (env.VERCEL_ENV !== "preview") {
    if ((env.VERCEL === "1" && env.VERCEL_ENV !== "development") || (branch === PR14_BRANCH && env.VERCEL_ENV !== "development")) {
      invalid("VERCEL_ENV", "deployment_context_missing_or_unknown");
    }
    if (env.VERCEL_ENV === undefined || env.VERCEL_ENV === "development") return "local-unverified";
    return "unknown-context-unverified";
  }

  // Never guess the branch from NODE_ENV or URLs. Missing Git context fails closed.
  // Marker is a separately approved, Preview + PR14 branch-scoped fallback only.
  if (!branch && !marker) invalid("VERCEL_GIT_COMMIT_REF", "preview_branch_missing");
  if (branch !== PR14_BRANCH && !marker) return "other-preview-unverified";

  if (!parsed || parsed.protocol !== "https:" || parsed.hostname !== STAGING_SUPABASE_HOST
    || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port
    || parsed.pathname !== "/" || (url !== `https://${STAGING_SUPABASE_HOST}` && url !== `https://${STAGING_SUPABASE_HOST}/`)) {
    invalid("NEXT_PUBLIC_SUPABASE_URL", "invalid_preview_endpoint");
  }
  const key = effectivePublicKey(env);
  const jwt = key ? claims(key) : null;
  const stagingAnon = jwt?.role === "anon" && jwt.ref === "xgelazzdgluuenqkymox";
  const stagingPublishable = key !== undefined && VERIFIED_STAGING_PUBLISHABLE_KEYS.some(verified => verified === key);
  if (!stagingAnon && !stagingPublishable) {
    invalid("NEXT_PUBLIC_SUPABASE_KEY", "preview_requires_verified_staging_key");
  }
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RESEND_API_KEY", "REPLICATE_API_TOKEN"]) {
    if (env[name]?.trim()) invalid(name, "preview_integration_must_be_disabled");
  }
  return "pr14-preview-isolated";
}
