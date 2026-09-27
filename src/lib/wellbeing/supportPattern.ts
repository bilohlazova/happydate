export type WellbeingCheckin = {
  mood: string;
  created_at: string;
};

export type WellbeingPattern = {
  lowDaysInWindow: number;
  consecutiveLowDays: number;
  needsSupport: boolean;
};

function localDay(timestamp: string, timezone: string): string | null {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return null;
  }
}

function calendarDayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}

/** Keeps one latest check-in per local calendar day before detecting a pattern. */
export function detectWellbeingPattern(
  checkins: readonly WellbeingCheckin[],
  timezone: string,
  requiredConsecutiveLowDays = 4,
): WellbeingPattern {
  const latestByDay = new Map<string, WellbeingCheckin>();
  for (const checkin of [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const day = localDay(checkin.created_at, timezone);
    if (day && !latestByDay.has(day)) latestByDay.set(day, checkin);
  }
  const daily = [...latestByDay.entries()].sort(([a], [b]) => b.localeCompare(a));
  let consecutiveLowDays = 0;
  let previousDay: number | null = null;
  for (const [day, checkin] of daily) {
    if (checkin.mood !== "low") break;
    const currentDay = calendarDayNumber(day);
    if (previousDay !== null && previousDay - currentDay !== 1) break;
    consecutiveLowDays += 1;
    previousDay = currentDay;
  }
  const lowDaysInWindow = daily.slice(0, 7).filter(([, checkin]) => checkin.mood === "low").length;
  return {
    lowDaysInWindow,
    consecutiveLowDays,
    needsSupport: consecutiveLowDays >= requiredConsecutiveLowDays,
  };
}

export function isSupportMomentCoolingDown(
  moments: readonly { created_at: string }[],
  now = new Date(),
  cooldownDays = 21,
): boolean {
  const threshold = now.getTime() - cooldownDays * 86_400_000;
  return moments.some(({ created_at }) => {
    const time = new Date(created_at).getTime();
    return Number.isFinite(time) && time >= threshold;
  });
}
