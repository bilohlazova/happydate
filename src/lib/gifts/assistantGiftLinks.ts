import { MAX_GIFT_LINK_URL_LENGTH, normalizeGiftHttpsUrl } from "./giftLinkUrl.ts";

const HTTPS_URL_CANDIDATE = /https:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[),.!?;:\]}]+$/;

export const MAX_ASSISTANT_GIFT_LINKS = 3;

export function extractAssistantGiftLinks(content: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  for (const candidate of content.match(HTTPS_URL_CANDIDATE) ?? []) {
    const trimmed = candidate.replace(TRAILING_PUNCTUATION, "");
    if (!trimmed || trimmed.length > MAX_GIFT_LINK_URL_LENGTH) continue;
    const normalized = normalizeGiftHttpsUrl(trimmed);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
    if (links.length === MAX_ASSISTANT_GIFT_LINKS) break;
  }

  return links;
}

export function giftLinkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
