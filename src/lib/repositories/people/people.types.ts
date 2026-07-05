export interface PersonSummary {
  id: string;

  firstName: string;

  birthday?: Date;

  relationship?: string;

  favoriteThings?: string[];

  lastContactAt?: Date;
}
