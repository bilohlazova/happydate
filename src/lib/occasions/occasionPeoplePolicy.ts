import type { OccasionDefinition } from "./occasion.types.ts";
import type { OccasionPersonProjection } from "./occasionPeople.types.ts";

export type OccasionPersonRelevance =
  | { readonly relevant: true; readonly reason: "relationship" | "explicit_gender" }
  | { readonly relevant: false; readonly reason: "gender_unknown" | "non_matching_gender" };

/**
 * Deterministic recipient policy.  It intentionally never reads a person's
 * name or localized relationship label.  `unspecified` is normalized to null
 * by the repository, so it cannot accidentally qualify a person.
 */
export function isPersonRelevantForOccasion(
  definition: OccasionDefinition,
  person: Pick<OccasionPersonProjection, "relationKey" | "gender">,
): OccasionPersonRelevance {
  const rule = definition.recipientRule;
  if (person.relationKey && rule.sufficientRelationships.includes(person.relationKey)) {
    return { relevant: true, reason: "relationship" };
  }
  if (person.gender === null) return { relevant: false, reason: "gender_unknown" };
  if (rule.allowedExplicitGenders.includes(person.gender as "male")) {
    return { relevant: true, reason: "explicit_gender" };
  }
  return { relevant: false, reason: "non_matching_gender" };
}
