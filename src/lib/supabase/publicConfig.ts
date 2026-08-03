export interface SupabasePublicConfig {
  url: string;
  key: string;
}

export interface SupabasePublicEnvironment {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

/**
 * Resolve the browser-safe Supabase configuration consistently everywhere.
 * Publishable keys are canonical; the legacy anon key remains a compatibility
 * fallback while existing deployments are migrated.
 */
export function resolveSupabasePublicConfig(
  environment: SupabasePublicEnvironment,
): SupabasePublicConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  return url && key ? { url, key } : null;
}

export function readSupabasePublicConfig(): SupabasePublicConfig | null {
  // Keep explicit property access: Next.js statically substitutes NEXT_PUBLIC
  // variables in browser bundles, whereas dynamic process.env lookups do not.
  return resolveSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = readSupabasePublicConfig();
  if (!config) {
    throw new Error("Missing public Supabase configuration");
  }
  return config;
}
