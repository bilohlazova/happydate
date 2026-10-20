import type { PersonRelationKey } from "../repositories/person.types.ts";

export type CountryCode = "PL";
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type WeekdayOrdinal = 1 | 2 | 3 | 4 | 5 | "last";

export type FixedDateRule = {
  readonly kind: "fixed";
  readonly month: number;
  readonly day: number;
};

export type NthWeekdayRule = {
  readonly kind: "nth_weekday";
  readonly month: number;
  readonly weekday: IsoWeekday;
  readonly ordinal: WeekdayOrdinal;
};

export type EasterRelativeRule = {
  readonly kind: "easter_relative";
  readonly calendar: "western";
  readonly offsetDays: number;
};

export type OccasionDateRule = FixedDateRule | NthWeekdayRule | EasterRelativeRule;
export type OccasionPhase = "planning" | "preparing" | "urgent" | "today";

export interface OccasionRecipientRule {
  readonly kind: "relationship_or_explicit_gender";
  /** Canonical relationship keys whose semantics alone establish the target. */
  readonly sufficientRelationships: readonly PersonRelationKey[];
  /** Explicit, persisted genders accepted when relationship is neutral. */
  readonly allowedExplicitGenders: readonly ["male"];
}

export interface OccasionDefinition {
  readonly key: string;
  readonly countryCode: CountryCode;
  readonly nameKey: string;
  readonly dateRule: OccasionDateRule;
  readonly phasePolicy: "preparation_v1";
  readonly recipientRule: OccasionRecipientRule;
}

export interface OccasionOccurrence {
  readonly occasionKey: string;
  readonly occurrenceKey: string;
  readonly countryCode: CountryCode;
  readonly localDate: string;
  readonly year: number;
  readonly daysUntil: number;
  readonly phase: OccasionPhase | null;
}
