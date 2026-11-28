// Owner-scoped local drafts. A draft may contain a private drawing, so it is keyed by the
// authenticated user and the previous owner's drafts are removed when the owner changes or signs out.
// Other owners' drafts and unrelated keys are never touched. Legacy keys
// (`happydate:symbol-draft:<personId>`, no owner) cannot be attributed to anyone and are dropped.
export const SYMBOL_DRAFT_PREFIX = "happydate:symbol-draft:";
const SYMBOL_DRAFT_V2_PREFIX = `${SYMBOL_DRAFT_PREFIX}v2:`;

export function symbolDraftKey(userId: string, personId: string): string {
  return `${SYMBOL_DRAFT_V2_PREFIX}${userId}:${personId}`;
}

function removeMatching(match: (key: string) => boolean): void {
  try {
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key && match(key)) storage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable (private mode, quota); nothing to clean.
  }
}

/** Logout / owner change: remove only the previous owner's drafts (other owners' and unrelated keys stay). */
export function purgeOwnerDrafts(userId: string): void {
  const prefix = `${SYMBOL_DRAFT_V2_PREFIX}${userId}:`;
  removeMatching((key) => key.startsWith(prefix));
}

/** One-time migration: drop legacy drafts that have no owner. */
export function purgeLegacySymbolDrafts(): void {
  removeMatching((key) => key.startsWith(SYMBOL_DRAFT_PREFIX) && !key.startsWith(SYMBOL_DRAFT_V2_PREFIX));
}
