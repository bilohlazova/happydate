export type BirthdayAgeInference =
  | { kind: "exact"; birthYear: number }
  | { kind: "ambiguous"; possibleBirthYears: readonly [number, number] }
  | { kind: "conflict"; existingBirthYear: number; inferredBirthYear: number }
  | { kind: "invalid"; reason: "age" | "birthYear" | "birthday" }
  | { kind: "unavailable" };

function localDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function validAge(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 130;
}

export function validBirthYear(value: unknown, now = new Date()): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= now.getFullYear();
}

/** Uses the same local-calendar Date construction as birthday occurrences.
 * Feb 29 consequently follows the app's existing rollover behavior. */
export function resolveNextBirthdayOccurrence(birthday: string | null | undefined, now = new Date()): Date | null {
  const match = typeof birthday === "string" && /^(?:\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;
  const month = Number(match[1]) - 1;
  const day = Number(match[2]);
  const today = localDay(now);
  const original = new Date(today.getFullYear(), month, day);
  const leapDayRollover = month === 1 && day === 29;
  if (month < 0 || month > 11 || day < 1 || day > 31 || (!leapDayRollover && original.getMonth() !== month) || !Number.isFinite(original.getTime())) return null;
  return original < today ? new Date(today.getFullYear() + 1, month, day) : original;
}

export function resolveBirthdayTurningAge(input: { birthYear: number | null | undefined; birthdayOccurrence: Date | string | null | undefined }, now = new Date()): number | null {
  if (!validBirthYear(input.birthYear, now)) return null;
  const occurrence = typeof input.birthdayOccurrence === "string"
    ? parseLocalDate(input.birthdayOccurrence)
    : input.birthdayOccurrence;
  if (!occurrence || !Number.isFinite(occurrence.getTime())) return null;
  const age = occurrence.getFullYear() - input.birthYear;
  return Number.isInteger(age) && age >= 0 && age <= 130 ? age : null;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

export function inferBirthYearFromCurrentAge(input: { currentAge: unknown; birthday?: string | null; existingBirthYear?: number | null; now?: Date }): BirthdayAgeInference {
  const now = input.now ?? new Date();
  if (!validAge(input.currentAge)) return { kind: "invalid", reason: "age" };
  const occurrence = resolveNextBirthdayOccurrence(input.birthday ?? null, now);
  if (!input.birthday) {
    const latest = now.getFullYear() - input.currentAge;
    return { kind: "ambiguous", possibleBirthYears: [latest - 1, latest] };
  }
  if (!occurrence) return { kind: "invalid", reason: "birthday" };
  // If the next birthday falls this year, it has not happened yet. Otherwise
  // it already happened in the trusted local calendar year.
  const candidate = occurrence.getFullYear() === now.getFullYear() && occurrence > localDay(now)
    ? now.getFullYear() - input.currentAge - 1
    : now.getFullYear() - input.currentAge;
  return inferred(candidate, input.existingBirthYear ?? null, now);
}

export function inferBirthYearFromTurningAge(input: { turningAge: unknown; birthdayOccurrence?: Date | string | null; existingBirthYear?: number | null; now?: Date }): BirthdayAgeInference {
  const now = input.now ?? new Date();
  if (!validAge(input.turningAge)) return { kind: "invalid", reason: "age" };
  const occurrence = typeof input.birthdayOccurrence === "string"
    ? parseLocalDate(input.birthdayOccurrence)
    : input.birthdayOccurrence ?? null;
  if (!occurrence) return { kind: "unavailable" };
  return inferred(occurrence.getFullYear() - input.turningAge, input.existingBirthYear ?? null, now);
}

function inferred(candidate: number, existingBirthYear: number | null, now: Date): BirthdayAgeInference {
  if (!validBirthYear(candidate, now)) return { kind: "invalid", reason: "birthYear" };
  if (existingBirthYear !== null && validBirthYear(existingBirthYear, now) && existingBirthYear !== candidate) {
    return { kind: "conflict", existingBirthYear, inferredBirthYear: candidate };
  }
  return { kind: "exact", birthYear: candidate };
}
