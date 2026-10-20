import { getOccasionDefinition } from "../occasions/occasionRegistry.ts";
import { occasionOccurrenceKey } from "../occasions/occasionResolver.ts";
import type { OccasionOccurrence } from "../occasions/occasion.types.ts";

const PERSON_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OCCASION_GIFT_CONTEXT_PATTERN = /^occasion:([a-z][a-z0-9_]*):(\d{4}):([0-9a-f-]{36})$/i;

/** Branded identity for a canonical Gift synthetic event context. */
export type OccasionGiftContext = string & { readonly __occasionGiftContext: unique symbol };

export interface ParsedOccasionGiftContext {
  readonly occasionKey: string;
  readonly year: number;
  readonly personId: string;
}

function assertPersonId(personId: string): void {
  if (!PERSON_ID_PATTERN.test(personId)) throw new TypeError("Invalid Occasion Gift person identity");
}

/** Builds the only supported Occasion Gift context identity. */
export function buildOccasionGiftContext(input: {
  occasionKey: string;
  year: number;
  personId: string;
}): OccasionGiftContext {
  const definition = getOccasionDefinition(input.occasionKey);
  if (!definition) throw new TypeError("Unknown Occasion identity");
  assertPersonId(input.personId);
  const occurrenceKey = occasionOccurrenceKey(definition.key, input.year);
  return `${occurrenceKey}:${input.personId}` as OccasionGiftContext;
}

/** Builds context only from a registry-validated canonical occurrence. */
export function buildOccasionGiftContextFromOccurrence(
  occurrence: Pick<OccasionOccurrence, "occasionKey" | "occurrenceKey" | "countryCode" | "year">,
  personId: string,
): OccasionGiftContext {
  const definition = getOccasionDefinition(occurrence.occasionKey);
  if (!definition || definition.countryCode !== occurrence.countryCode
    || occasionOccurrenceKey(occurrence.occasionKey, occurrence.year) !== occurrence.occurrenceKey) {
    throw new TypeError("Invalid Occasion occurrence");
  }
  return buildOccasionGiftContext({ occasionKey: definition.key, year: occurrence.year, personId });
}

/** Strict parser used only at trusted domain boundaries. */
export function parseOccasionGiftContext(value: string): ParsedOccasionGiftContext | null {
  const match = OCCASION_GIFT_CONTEXT_PATTERN.exec(value);
  if (!match) return null;
  const [, occasionKey, yearText, personId] = match;
  const year = Number(yearText);
  try {
    const canonical = buildOccasionGiftContext({ occasionKey, year, personId });
    return canonical === value ? { occasionKey, year, personId } : null;
  } catch {
    return null;
  }
}
