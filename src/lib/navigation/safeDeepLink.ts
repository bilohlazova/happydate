export const NATIVE_URL_SCHEME = "com.happydate.app";
export const PRODUCTION_WEB_ORIGIN = "https://happydate.vercel.app";

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
