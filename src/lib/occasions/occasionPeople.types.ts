import type { PersonGender, PersonRelationKey } from "../repositories/person.types.ts";

export type OccasionPersonGender = Exclude<PersonGender, "unspecified"> | null;

export interface OccasionPersonProjection {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly relationKey: PersonRelationKey | null;
  readonly gender: OccasionPersonGender;
}

export interface OccasionPersonCandidate {
  readonly personId: string;
  readonly name: string;
  readonly relationKey: PersonRelationKey | null;
}

export type OccasionPeopleResolution =
  | { readonly kind: "none"; readonly occasionKey: string; readonly occurrenceKey: string }
  | { readonly kind: "resolved"; readonly occasionKey: string; readonly occurrenceKey: string; readonly personId: string }
  | {
      readonly kind: "selection_required";
      readonly occasionKey: string;
      readonly occurrenceKey: string;
      readonly candidates: readonly OccasionPersonCandidate[];
    };
