const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Canonical read identity used by Gift, Home and Assistant consumers. */
export function canonicalGiftEventContext(
  eventId: string | null | undefined,
  eventContextKey: string | null | undefined,
): string | null {
  return eventContextKey?.trim() || eventId?.trim() || null;
}

/** Splits the canonical identity into the two mutually exclusive DB columns. */
export function persistedGiftEventIdentity(value: string | null | undefined): {
  eventId: string | null;
  eventContextKey: string | null;
} {
  const context = value?.trim() || null;
  const isUuid = Boolean(context && UUID_PATTERN.test(context));
  return {
    eventId: isUuid ? context : null,
    eventContextKey: context && !isUuid ? context : null,
  };
}
