import type { OccasionDateRule, IsoWeekday, WeekdayOrdinal } from "./occasion.types.ts";

export type DateOnly = `${number}-${number}-${number}`;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function validYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1 && year <= 9999;
}

function validMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validDateOnly(value: string): value is DateOnly {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return validYear(year) && validMonth(month) && day >= 1 && day <= daysInMonth(year, month);
}

function assertDateOnly(value: string): asserts value is DateOnly {
  if (!validDateOnly(value)) throw new TypeError("Invalid date-only value");
}

export function validateOccasionDateRule(value: unknown): value is OccasionDateRule {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "fixed") {
    return exactKeys(value, ["kind", "month", "day"])
      && validMonth(value.month as number)
      && Number.isInteger(value.day)
      && (value.day as number) >= 1
      && (value.day as number) <= 31;
  }
  if (value.kind === "nth_weekday") {
    return exactKeys(value, ["kind", "month", "weekday", "ordinal"])
      && validMonth(value.month as number)
      && Number.isInteger(value.weekday)
      && (value.weekday as number) >= 1
      && (value.weekday as number) <= 7
      && ([1, 2, 3, 4, 5, "last"] as unknown[]).includes(value.ordinal);
  }
  if (value.kind === "easter_relative") {
    return exactKeys(value, ["kind", "calendar", "offsetDays"])
      && value.calendar === "western"
      && Number.isInteger(value.offsetDays)
      && Math.abs(value.offsetDays as number) <= 366;
  }
  return false;
}

export function assertValidOccasionDateRule(value: unknown): asserts value is OccasionDateRule {
  if (!validateOccasionDateRule(value)) throw new TypeError("Invalid Occasion date rule");
}

function dateOnlyFromUtc(date: Date): DateOnly {
  return date.toISOString().slice(0, 10) as DateOnly;
}

function addDays(date: DateOnly, offsetDays: number): DateOnly {
  assertDateOnly(date);
  const [year, month, day] = date.split("-").map(Number);
  return dateOnlyFromUtc(new Date(Date.UTC(year, month - 1, day + offsetDays)));
}

function isoWeekday(date: Date): IsoWeekday {
  const day = date.getUTCDay();
  return (day === 0 ? 7 : day) as IsoWeekday;
}

function resolveNthWeekday(rule: Extract<OccasionDateRule, { kind: "nth_weekday" }>, year: number): DateOnly | null {
  const first = new Date(Date.UTC(year, rule.month - 1, 1));
  if (rule.ordinal === "last") {
    const last = new Date(Date.UTC(year, rule.month, 0));
    const delta = (isoWeekday(last) - rule.weekday + 7) % 7;
    return dateOnlyFromUtc(new Date(Date.UTC(year, rule.month - 1, last.getUTCDate() - delta)));
  }
  const delta = (rule.weekday - isoWeekday(first) + 7) % 7;
  const day = 1 + delta + (rule.ordinal - 1) * 7;
  if (day > daysInMonth(year, rule.month)) return null;
  return dateOnlyFromUtc(new Date(Date.UTC(year, rule.month - 1, day)));
}

function westernEaster(year: number): DateOnly {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateOnlyFromUtc(new Date(Date.UTC(year, month - 1, day)));
}

export function resolveOccasionDate(input: { rule: OccasionDateRule; year: number }): DateOnly | null {
  const { rule, year } = input;
  if (!validYear(year)) throw new TypeError("Invalid occasion year");
  assertValidOccasionDateRule(rule);
  if (rule.kind === "fixed") {
    if (rule.day > daysInMonth(year, rule.month)) return null;
    return dateOnlyFromUtc(new Date(Date.UTC(year, rule.month - 1, rule.day)));
  }
  if (rule.kind === "nth_weekday") return resolveNthWeekday(rule, year);
  return addDays(westernEaster(year), rule.offsetDays);
}

export function compareDateOnly(left: DateOnly, right: DateOnly): number {
  assertDateOnly(left);
  assertDateOnly(right);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function daysBetweenDateOnly(from: DateOnly, to: DateOnly): number {
  assertDateOnly(from);
  assertDateOnly(to);
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function isDateOnly(value: string): value is DateOnly {
  return validDateOnly(value);
}

export type { IsoWeekday, WeekdayOrdinal };
