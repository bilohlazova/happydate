import { assertValidOccasionDateRule } from "./occasionDate.ts";
import type { CountryCode, OccasionDefinition } from "./occasion.types.ts";

export const OCCASION_REGISTRY = [
  {
    key: "pl_boys_day",
    countryCode: "PL",
    nameKey: "occasions.plBoysDay",
    dateRule: { kind: "fixed", month: 9, day: 30 },
    phasePolicy: "preparation_v1",
    // Current canonical relation keys are gender-neutral.  Therefore this
    // V1 rule requires explicit persisted male gender; labels/names never
    // establish eligibility.
    recipientRule: {
      kind: "relationship_or_explicit_gender",
      sufficientRelationships: [],
      allowedExplicitGenders: ["male"],
    },
  },
] as const satisfies readonly OccasionDefinition[];

function isCountryCode(value: string): value is CountryCode {
  return /^[A-Z]{2}$/.test(value) && value === "PL";
}

export function validateOccasionDefinition(value: unknown): value is OccasionDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const definition = value as Record<string, unknown>;
  const keys = Object.keys(definition).sort();
  if (keys.join(",") !== ["countryCode", "dateRule", "key", "nameKey", "phasePolicy", "recipientRule"].sort().join(",")) return false;
  return typeof definition.key === "string"
    && /^[a-z][a-z0-9_]*$/.test(definition.key)
    && typeof definition.nameKey === "string"
    && isCountryCode(String(definition.countryCode))
    && definition.phasePolicy === "preparation_v1"
    && (() => {
      const rule = definition.recipientRule;
      if (!rule || typeof rule !== "object" || Array.isArray(rule)) return false;
      const record = rule as Record<string, unknown>;
      const relationships = record.sufficientRelationships;
      const genders = record.allowedExplicitGenders;
      return record.kind === "relationship_or_explicit_gender"
        && Array.isArray(relationships)
        && relationships.every((value) => typeof value === "string" && /^[a-z_]+$/.test(value))
        && Array.isArray(genders)
        && genders.length === 1
        && genders[0] === "male";
    })()
    && (() => { try { assertValidOccasionDateRule(definition.dateRule); return true; } catch { return false; } })();
}

export function assertValidOccasionRegistry(definitions: readonly OccasionDefinition[] = OCCASION_REGISTRY): void {
  const keys = new Set<string>();
  for (const definition of definitions) {
    if (!validateOccasionDefinition(definition) || keys.has(definition.key)) throw new TypeError("Invalid or duplicate Occasion definition");
    keys.add(definition.key);
  }
}

assertValidOccasionRegistry();

export function getOccasionDefinitionsForCountry(countryCode: string | null | undefined): readonly OccasionDefinition[] {
  if (!isCountryCode(String(countryCode ?? ""))) return [];
  return OCCASION_REGISTRY.filter((definition) => definition.countryCode === countryCode);
}

export function getOccasionDefinition(key: string): OccasionDefinition | null {
  return OCCASION_REGISTRY.find((definition) => definition.key === key) ?? null;
}
