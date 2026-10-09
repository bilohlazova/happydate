import { inferBirthYearFromCurrentAge, inferBirthYearFromTurningAge, resolveNextBirthdayOccurrence, type BirthdayAgeInference } from "./birthdayAge.ts";

export type BirthdayAgeInput = { type: "current_age"; age: number } | { type: "turning_age"; age: number };
export type BirthdayAgeSuggestion = BirthdayAgeInference | { kind: "match"; birthYear: number };

/** The date is already resolved in the owner's timezone, never the browser's. */
export function resolveBirthdayAgeInput(input: BirthdayAgeInput, birthday: string, birthYear: string, today: string): BirthdayAgeSuggestion {
  const now = new Date(`${today}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(now.getTime())) return { kind: "unavailable" };
  const existingBirthYear = birthYear.trim() ? Number(birthYear) : null;
  const result = input.type === "current_age"
    ? inferBirthYearFromCurrentAge({ currentAge: input.age, birthday, existingBirthYear, now })
    : inferBirthYearFromTurningAge({ turningAge: input.age, birthdayOccurrence: resolveNextBirthdayOccurrence(birthday, now), existingBirthYear, now });
  return result.kind === "exact" && result.birthYear === existingBirthYear ? { kind: "match", birthYear: result.birthYear } : result;
}

export function confirmedBirthdayYear(current: string, suggestion: BirthdayAgeSuggestion, action: "confirm" | "dismiss"): string {
  if (action !== "confirm") return current;
  if (suggestion.kind === "exact") return String(suggestion.birthYear);
  if (suggestion.kind === "conflict") return String(suggestion.inferredBirthYear);
  return current;
}
