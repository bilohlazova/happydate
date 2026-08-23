export const MAX_GIFT_LINK_URL_LENGTH = 2_048;

export function normalizeGiftHttpsUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_GIFT_LINK_URL_LENGTH) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && parsed.hostname ? parsed.toString() : null;
  } catch {
    return null;
  }
}
