import { normalizeGiftHttpsUrl } from "../gifts/giftLinkUrl.ts";
import { normalizeGiftTitle } from "./giftRecommendationValidation.ts";
import { normalizeEvidenceUrl, provenanceFor, type UrlProvenance } from "./urlProvenance.ts";

/**
 * A real product page found by live web search for one gift idea. Offers are
 * evidence-checked on the server, never trusted blindly from the model.
 */
export type GiftProductOffer = {
  productName: string;
  merchant: string;
  url: string;
  price: number | null;
  currency: string | null;
  /**
   * True only when this EXACT url (not merely its domain) was returned or cited
   * by the search tool. It says where the URL came from; it does not say the
   * page is reachable, is this product, or shows a current price.
   */
  sourceVerified: boolean;
  /** Origin and the not-yet-checked dimensions, kept separate on purpose (HD-LINK-002). */
  provenance: UrlProvenance;
  checkedAt: string;
};

export type RawGiftOffer = {
  ideaTitle?: unknown;
  productName?: unknown;
  merchant?: unknown;
  url?: unknown;
  price?: unknown;
  currency?: unknown;
};

export const giftOffersJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["offers"],
  properties: {
    offers: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ideaTitle", "productName", "merchant", "url", "price", "currency"],
        properties: {
          ideaTitle: { type: "string", maxLength: 200 },
          productName: { type: "string", maxLength: 200 },
          merchant: { type: "string", maxLength: 100 },
          url: { type: "string", maxLength: 2000 },
          price: { type: ["number", "null"] },
          currency: { type: ["string", "null"], maxLength: 12 },
        },
      },
    },
  },
} as const;

function clean(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, limit);
  return normalized || null;
}

function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
  return host.includes(".");
}

function hasEmbeddedCredentials(url: string): boolean {
  try { const parsed = new URL(url); return Boolean(parsed.username || parsed.password); } catch { return true; }
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

export type OfferValidationInput = {
  offers: readonly RawGiftOffer[];
  /** Titles of the validated suggestions the offers must belong to. */
  ideaTitles: readonly string[];
  budget: { amount: number | null; currency: string | null };
  /** URLs the search tool returned or cited. Empty when the API exposed none. */
  citedUrls: readonly string[];
  now?: Date;
};

export type OfferValidationResult = {
  /** Offer per idea, keyed by normalized idea title. */
  byIdeaKey: Map<string, GiftProductOffer>;
  rejected: number;
  rejectedCurrency: number;
  rejectedOverBudget: number;
  /** Offers whose domain was cited but whose exact URL was not (an invented or altered path). */
  rejectedHostOnly: number;
  /** Offers rejected because the search tool exposed no matching source for them. */
  rejectedUnsourced: number;
};

/**
 * Keeps at most one offer per idea and only when it is an https product URL on
 * a public host, matches an idea we actually showed, is within the budget
 * ceiling and was returned or cited by the search tool as that EXACT url.
 * A cited domain never confirms a different path, and an offer is never kept
 * when no source exists: a URL produced only by the model is not evidence.
 */
export function validateGiftOffers(input: OfferValidationInput): OfferValidationResult {
  const ideaKeys = new Map(input.ideaTitles.map((title) => [normalizeGiftTitle(title), title]));
  const citedHosts = new Set(input.citedUrls.map(hostOf).filter((host): host is string => Boolean(host)));
  const citedExact = new Set(input.citedUrls.map((url) => normalizeEvidenceUrl(url)).filter((url): url is string => Boolean(url)));
  const byIdeaKey = new Map<string, GiftProductOffer>();
  let rejected = 0;
  let rejectedCurrency = 0;
  let rejectedOverBudget = 0;
  let rejectedHostOnly = 0;
  let rejectedUnsourced = 0;
  for (const raw of input.offers) {
    const ideaTitle = clean(raw.ideaTitle, 200);
    const key = ideaTitle ? normalizeGiftTitle(ideaTitle) : "";
    const url = typeof raw.url === "string" ? normalizeGiftHttpsUrl(raw.url) : null;
    const productName = clean(raw.productName, 200);
    const merchant = clean(raw.merchant, 100);
    if (!key || !ideaKeys.has(key) || byIdeaKey.has(key) || !url || !productName || !merchant) { rejected += 1; continue; }
    const host = hostOf(url);
    if (!host || !isPublicHost(host) || hasEmbeddedCredentials(url)) { rejected += 1; continue; }
    const evidenceUrl = normalizeEvidenceUrl(url);
    const sourceVerified = evidenceUrl !== null && citedExact.has(evidenceUrl);
    if (!sourceVerified) {
      rejected += 1;
      if (citedHosts.has(host)) rejectedHostOnly += 1; else rejectedUnsourced += 1;
      continue;
    }
    const price = typeof raw.price === "number" && Number.isFinite(raw.price) && raw.price >= 0
      ? Math.round(raw.price * 100) / 100
      : null;
    const currency = clean(raw.currency, 12)?.toLocaleUpperCase() ?? null;
    if (price !== null && input.budget.amount !== null) {
      // The user's budget is a ceiling, not a hint: no tolerance. A price in a different currency cannot be
      // checked against it (49 EUR may be over 200 PLN), so such an offer is not shown at all.
      const sameCurrency = !currency || !input.budget.currency || currency === input.budget.currency;
      if (!sameCurrency) { rejected += 1; rejectedCurrency += 1; continue; }
      if (price > input.budget.amount) { rejected += 1; rejectedOverBudget += 1; continue; }
    }
    byIdeaKey.set(key, {
      productName, merchant, url, price, currency, sourceVerified,
      provenance: provenanceFor("search_sourced"),
      checkedAt: (input.now ?? new Date()).toISOString(),
    });
  }
  return { byIdeaKey, rejected, rejectedCurrency, rejectedOverBudget, rejectedHostOnly, rejectedUnsourced };
}

/** Search-tool market hint from the budget currency, falling back to the UI locale. */
export function marketCountryFor(currency: string | null, locale: string): string | null {
  switch (currency?.toUpperCase()) {
    case "PLN": return "PL";
    case "UAH": return "UA";
    case "USD": return "US";
    case "GBP": return "GB";
    case "CHF": return "CH";
    case "CZK": return "CZ";
    default: break;
  }
  if (!currency) {
    if (locale === "pl") return "PL";
    if (locale === "uk") return "UA";
    if (locale === "de") return "DE";
  }
  return null;
}
