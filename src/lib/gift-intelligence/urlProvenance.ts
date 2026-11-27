/**
 * HD-LINK-002 Phase 0 — where a product URL came from.
 *
 * Four separate questions, never collapsed into one "verified" boolean:
 *   1. origin               — who/what produced this URL (this file's main output)
 *   2. availability         — does the page respond           (Phase 0: never checked)
 *   3. productConfirmation  — is it really the recommended product (never confirmed)
 *   4. priceFreshness       — is the price current            (never checked)
 *
 * Phase 0 performs NO network requests, so dimensions 2–4 are fixed literals.
 * Only a future server-side verifier (Phase 2+) may widen them, and only that
 * verifier may produce `product_verified`. A URL that exists solely in model
 * output, in a client message or in a client-supplied field can never reach it.
 *
 * Pure module: no server-only imports, safe for server and client code.
 */

export type UrlOrigin =
  | "user_provided"      // the user typed/pasted it in this conversation
  | "saved_unverified"   // stored in gift_links; nothing about it was ever checked
  | "search_sourced"     // exact URL returned or cited by the live search tool
  | "product_verified"   // reserved: assignable only by a future server verifier
  | "unknown";           // anything else, including every model-only URL

export type UrlAvailability = "not_checked";
export type ProductConfirmation = "not_confirmed";
export type PriceFreshness = "not_checked";

export type UrlProvenance = Readonly<{
  origin: UrlOrigin;
  availability: UrlAvailability;
  productConfirmation: ProductConfirmation;
  priceFreshness: PriceFreshness;
}>;

const MAX_URL_LENGTH = 2_048;
const MAX_EVIDENCE_URLS = 200;
const MAX_MESSAGE_CHARS = 8_000;
const HTTPS_CANDIDATE = /https:\/\/[^\s<>"'\u0000-\u001f\u007f]+/gi;
const TRAILING = /[),.!?;:\]}>]+$/;
const TRACKING_PARAM = /^(utm_[a-z0-9_]+|gclid|fbclid|msclkid|mc_cid|mc_eid|igshid)$/i;

/** Origins a server-side code path may assign in Phase 0. `product_verified` is intentionally absent. */
export const PHASE0_ASSIGNABLE_ORIGINS = ["user_provided", "saved_unverified", "search_sourced", "unknown"] as const;

export function provenanceFor(origin: Exclude<UrlOrigin, "product_verified">): UrlProvenance {
  return Object.freeze({ origin, availability: "not_checked", productConfirmation: "not_confirmed", priceFreshness: "not_checked" });
}

/**
 * Anything arriving from a client, a request body or a model is data, not
 * evidence. This maps every untrusted value to `unknown`, including a forged
 * "product_verified" or "search_sourced".
 */
export function parseUntrustedOrigin(_value: unknown): UrlOrigin {
  return "unknown";
}

/** Phase 0 never confirms a product, availability or price, whatever the origin. */
export function isConfirmedProduct(_provenance: UrlProvenance): false {
  return false;
}

/**
 * Canonical form used ONLY to compare evidence: https, no credentials, no
 * fragment, no tracking parameters. Host and path stay exact — `www.` and a
 * different path are different URLs, so evidence for one product page never
 * covers another page of the same shop.
 */
export function normalizeEvidenceUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

export function extractEvidenceUrls(text: string): string[] {
  const found: string[] = [];
  for (const candidate of text.slice(0, MAX_MESSAGE_CHARS).match(HTTPS_CANDIDATE) ?? []) {
    const normalized = normalizeEvidenceUrl(candidate.replace(TRAILING, ""));
    if (normalized) found.push(normalized);
    if (found.length >= MAX_EVIDENCE_URLS) break;
  }
  return found;
}

export type UrlEvidenceInput = {
  /** Messages the USER wrote in this conversation (never assistant text). */
  userMessages?: readonly string[];
  /** URLs stored in the user's own gift_links. */
  savedUrls?: readonly string[];
  /** Exact URLs returned or cited by the search tool in this request. */
  searchSourcedUrls?: readonly string[];
};

export type UrlEvidenceRegistry = {
  classify(url: string): UrlProvenance;
};

/** Precedence when one URL has several sources: the most user-owned wins. All of them are "not verified". */
export function createUrlEvidenceRegistry(input: UrlEvidenceInput): UrlEvidenceRegistry {
  const user = new Set<string>();
  for (const message of input.userMessages ?? []) for (const url of extractEvidenceUrls(message)) user.add(url);
  const saved = new Set<string>();
  for (const raw of input.savedUrls ?? []) { const url = normalizeEvidenceUrl(raw); if (url) saved.add(url); }
  const sourced = new Set<string>();
  for (const raw of input.searchSourcedUrls ?? []) { const url = normalizeEvidenceUrl(raw); if (url) sourced.add(url); }
  return {
    classify(raw: string): UrlProvenance {
      const url = normalizeEvidenceUrl(raw);
      if (!url) return provenanceFor("unknown");
      if (user.has(url)) return provenanceFor("user_provided");
      if (saved.has(url)) return provenanceFor("saved_unverified");
      if (sourced.has(url)) return provenanceFor("search_sourced");
      return provenanceFor("unknown");
    },
  };
}
