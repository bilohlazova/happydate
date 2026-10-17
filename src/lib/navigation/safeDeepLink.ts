export const NATIVE_URL_SCHEME = "com.happydate.app";
export const PRODUCTION_WEB_ORIGIN = "https://happydate.vercel.app";

/**
 * Resolve the web origin used by Supabase auth callbacks at runtime.
 *
 * Preview deployments must callback to the deployment that initiated auth,
 * while server rendering has no window. The allowlist keeps arbitrary hosts
 * from becoming callback origins; Supabase still enforces its URL allowlist.
 */
export function webAuthOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const isVercelPreview = hostname.endsWith(".vercel.app");
    const isLocalDevelopment = hostname === "localhost" || hostname === "127.0.0.1";

    if (origin === PRODUCTION_WEB_ORIGIN || isVercelPreview || isLocalDevelopment) {
      return origin;
    }
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim() || PRODUCTION_WEB_ORIGIN;
}

const allowedPathRoots = new Set([
  "about",
  "auth",
  "calendar",
  "care",
  "dashboard",
  "gift",
  "notes",
  "people",
  "privacy",
  "profile",
  "services",
  "settings",
  "survey",
  "onboarding-preview",
]);

function cleanInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, PRODUCTION_WEB_ORIGIN);
    if (parsed.origin !== PRODUCTION_WEB_ORIGIN) return fallback;
    const root = parsed.pathname.split("/").filter(Boolean)[0];
    if (!root || !allowedPathRoots.has(root)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function safePostAuthPath(value: string | null | undefined, fallback = "/dashboard"): string {
  return cleanInternalPath(value, fallback);
}

export function internalPathFromNativeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    let candidate: string;

    if (url.protocol === `${NATIVE_URL_SCHEME}:`) {
      const host = url.hostname;
      candidate = `/${host}${url.pathname}${url.search}${url.hash}`;
    } else if (url.origin === PRODUCTION_WEB_ORIGIN) {
      candidate = `${url.pathname}${url.search}${url.hash}`;
    } else {
      return null;
    }

    return cleanInternalPath(candidate, "") || null;
  } catch {
    return null;
  }
}

export function nativeAuthRedirect(path: "/auth/callback" | "/auth/update-password", query = ""): string {
  const suffix = query ? `?${query.replace(/^\?/, "")}` : "";
  return `${NATIVE_URL_SCHEME}://${path.slice(1)}${suffix}`;
}
