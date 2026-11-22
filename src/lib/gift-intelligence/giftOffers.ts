import { normalizeGiftHttpsUrl } from "../gifts/giftLinkUrl.ts";
import { normalizeGiftTitle } from "./giftRecommendationValidation.ts";

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
  /** True when the URL belongs to a page the search tool actually returned or cited. */
  sourceVerified: boolean;
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
};

/**
 * Keeps at most one offer per idea and only when it is a real https product
 * page on a public host, matches an idea we actually showed, is within budget
 * (+15%) and, when the tool exposed its sources, comes from them.
 */
export function validateGiftOffers(input: OfferValidationInput): OfferValidationResult {
  const ideaKeys = new Map(input.ideaTitles.map((title) => [normalizeGiftTitle(title), title]));
  const citedHosts = new Set(input.citedUrls.map(hostOf).filter((host): host is string => Boolean(host)));
  const citedExact = new Set(input.citedUrls.map((url) => normalizeGiftHttpsUrl(url)).filter((url): url is string => Boolean(url)));
  const byIdeaKey = new Map<string, GiftProductOffer>();
  let rejected = 0;
  for (const raw of input.offers) {
    const ideaTitle = clean(raw.ideaTitle, 200);
    const key = ideaTitle ? normalizeGiftTitle(ideaTitle) : "";
    const url = typeof raw.url === "string" ? normalizeGiftHttpsUrl(raw.url) : null;
    const productName = clean(raw.productName, 200);
    const merchant = clean(raw.merchant, 100);
    if (!key || !ideaKeys.has(key) || byIdeaKey.has(key) || !url || !productName || !merchant) { rejected += 1; continue; }
    const host = hostOf(url);
    if (!host || !isPublicHost(host) || hasEmbeddedCredentials(url)) { rejected += 1; continue; }
    const hasSources = input.citedUrls.length > 0;
    const sourceVerified = hasSources && (citedExact.has(url) || citedHosts.has(host));
    if (hasSources && !sourceVerified) { rejected += 1; continue; }
    const price = typeof raw.price === "number" && Number.isFinite(raw.price) && raw.price >= 0
      ? Math.round(raw.price * 100) / 100
      : null;
    const currency = clean(raw.currency, 12)?.toLocaleUpperCase() ?? null;
    if (
      price !== null && input.budget.amount !== null && price > input.budget.amount * 1.15 &&
      (!currency || !input.budget.currency || currency === input.budget.currency)
    ) { rejected += 1; continue; }
    byIdeaKey.set(key, {
      productName, merchant, url, price, currency, sourceVerified,
      checkedAt: (input.now ?? new Date()).toISOString(),
    });
  }
  return { byIdeaKey, rejected };
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
