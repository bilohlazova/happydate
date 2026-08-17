export interface DayPlanDraftItem {
  eventId: string;
  title: string;
  timeOfDay: string;
  durationMinutes: number;
  travelBufferMinutes?: number;
}

export interface DayPlanFixedEvent {
  id: string;
  title: string;
  timeOfDay: string;
  durationMinutes: number;
  travelBufferMinutes?: number;
}

export interface DayPlanConflict {
  firstId: string;
  secondId: string;
}

export interface DayPlanSummary {
  taskCount: number;
  focusMinutes: number;
  travelMinutes: number;
  startTime: string;
  finishTime: string;
}

export type DayPlanMoveDirection = "up" | "down";

export function selectDayPlanCandidates<T extends { isImportant?: boolean | null }>(
  events: ReadonlyArray<T>,
  limit = 10,
): { selected: T[]; deferred: T[] } {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return { selected: [], deferred: [...events] };
  const ordered = events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => Number(right.event.isImportant === true) - Number(left.event.isImportant === true) || left.index - right.index)
    .map(({ event }) => event);
  return { selected: ordered.slice(0, limit), deferred: ordered.slice(limit) };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesFromTime(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesFromDayBoundary(value: string): number | null {
  return value === "24:00" ? 24 * 60 : minutesFromTime(value);
}

function timeFromMinutes(value: number): string {
  if (value === 24 * 60) return "24:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function isValidEventTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isValidEventDuration(value: number): boolean {
  return Number.isInteger(value) && value >= 5 && value <= 1440;
}

export function isValidTravelBuffer(value: number): boolean {
  return Number.isInteger(value) && value >= 5 && value <= 240;
}

export function isValidDayPlanItem(value: Pick<DayPlanDraftItem, "timeOfDay" | "durationMinutes" | "travelBufferMinutes">): boolean {
  const start = minutesFromTime(value.timeOfDay);
  const travel = value.travelBufferMinutes ?? 0;
  return start !== null && (travel === 0 || isValidTravelBuffer(travel)) && start - travel >= 0 && isValidEventDuration(value.durationMinutes) && start + value.durationMinutes <= 24 * 60;
}

export function summarizeDayPlanDraft(draft: ReadonlyArray<DayPlanDraftItem>): DayPlanSummary | null {
  if (draft.length === 0 || draft.some((item) => !isValidDayPlanItem(item))) return null;
  const intervals = draft.map((item) => {
    const start = minutesFromTime(item.timeOfDay)!;
    return { start, end: start + item.durationMinutes, durationMinutes: item.durationMinutes };
  });
  return {
    taskCount: intervals.length,
    focusMinutes: intervals.reduce((total, item) => total + item.durationMinutes, 0),
    travelMinutes: draft.reduce((total, item) => total + (item.travelBufferMinutes ?? 0), 0),
    startTime: timeFromMinutes(Math.min(...intervals.map((item) => item.start))),
    finishTime: timeFromMinutes(Math.max(...intervals.map((item) => item.end))),
  };
}

export function isValidDayPlanItemWithinWindow(
  value: Pick<DayPlanDraftItem, "timeOfDay" | "durationMinutes" | "travelBufferMinutes">,
  windowStart: string,
  windowEnd: string,
): boolean {
  const start = minutesFromTime(value.timeOfDay);
  const travel = value.travelBufferMinutes ?? 0;
  const boundaryStart = minutesFromTime(windowStart);
  const boundaryEnd = minutesFromDayBoundary(windowEnd);
  return start !== null
    && boundaryStart !== null
    && boundaryEnd !== null
    && boundaryStart < boundaryEnd
    && isValidEventDuration(value.durationMinutes)
    && (travel === 0 || isValidTravelBuffer(travel))
    && start - travel >= boundaryStart
    && start + value.durationMinutes <= boundaryEnd;
}

export function buildDayPlanDraft(
  events: ReadonlyArray<{ id: string; title: string; durationMinutes?: number | null; travelBufferMinutes?: number | null }>,
  startTime: string,
  gapMinutes = 0,
  defaultDurationMinutes = 60,
  fixedEvents: ReadonlyArray<DayPlanFixedEvent> = [],
  endTime = "24:00",
): DayPlanDraftItem[] | null {
  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromDayBoundary(endTime);
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes || !Number.isInteger(gapMinutes) || gapMinutes < 0 || gapMinutes > 240 || !isValidEventDuration(defaultDurationMinutes)) {
    return null;
  }
  const limitedEvents = events.slice(0, 10);
  const occupied = fixedEvents.flatMap((event) => {
    const start = minutesFromTime(event.timeOfDay);
    return start !== null && isValidEventDuration(event.durationMinutes)
      ? [{ start: Math.max(0, start - (isValidTravelBuffer(event.travelBufferMinutes ?? 0) ? event.travelBufferMinutes! : 0)), end: start + event.durationMinutes }]
      : [];
  }).filter((interval) => interval.end <= 24 * 60).sort((a, b) => a.start - b.start || a.end - b.end);
  let cursor = startMinutes;
  const result: DayPlanDraftItem[] = [];
  for (const event of limitedEvents) {
    const durationMinutes = isValidEventDuration(event.durationMinutes ?? 0)
      ? event.durationMinutes!
      : defaultDurationMinutes;
    const travelBufferMinutes = isValidTravelBuffer(event.travelBufferMinutes ?? 0) ? event.travelBufferMinutes! : 0;
    const blockDuration = travelBufferMinutes + durationMinutes;
    let conflict = occupied.find((interval) => cursor < interval.end && cursor + blockDuration > interval.start);
    while (conflict) {
      cursor = conflict.end + gapMinutes;
      conflict = occupied.find((interval) => cursor < interval.end && cursor + blockDuration > interval.start);
    }
    if (cursor + blockDuration > endMinutes) return null;
    result.push({
      eventId: event.id,
      title: event.title,
      timeOfDay: `${String(Math.floor((cursor + travelBufferMinutes) / 60)).padStart(2, "0")}:${String((cursor + travelBufferMinutes) % 60).padStart(2, "0")}`,
      durationMinutes,
      ...(travelBufferMinutes ? { travelBufferMinutes } : {}),
    });
    cursor += blockDuration + gapMinutes;
  }
  return result;
}

export function findDayPlanConflicts(
  draft: ReadonlyArray<DayPlanDraftItem>,
  fixedEvents: ReadonlyArray<DayPlanFixedEvent> = [],
): DayPlanConflict[] {
  const intervals = [
    ...draft.map((event) => ({ id: event.eventId, timeOfDay: event.timeOfDay, durationMinutes: event.durationMinutes, travelBufferMinutes: event.travelBufferMinutes, fixed: false })),
    ...fixedEvents.map((event) => ({ id: event.id, timeOfDay: event.timeOfDay, durationMinutes: event.durationMinutes, travelBufferMinutes: event.travelBufferMinutes, fixed: true })),
  ].flatMap((event) => {
    const start = minutesFromTime(event.timeOfDay);
    return start !== null && isValidEventDuration(event.durationMinutes) && start + event.durationMinutes <= 24 * 60
      ? [{ id: event.id, start: Math.max(0, start - (isValidTravelBuffer(event.travelBufferMinutes ?? 0) ? event.travelBufferMinutes! : 0)), end: start + event.durationMinutes, fixed: event.fixed }]
      : [];
  }).sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));

  const conflicts: DayPlanConflict[] = [];
  for (let index = 0; index < intervals.length; index += 1) {
    for (let candidate = index + 1; candidate < intervals.length && intervals[candidate].start < intervals[index].end; candidate += 1) {
      if (intervals[index].fixed && intervals[candidate].fixed) continue;
      conflicts.push({ firstId: intervals[index].id, secondId: intervals[candidate].id });
    }
  }
  return conflicts;
}

export function reorderDayPlanDraft(
  draft: ReadonlyArray<DayPlanDraftItem>,
  eventId: string,
  direction: DayPlanMoveDirection,
  startTime: string,
  gapMinutes: number,
  fixedEvents: ReadonlyArray<DayPlanFixedEvent>,
  endTime: string,
): DayPlanDraftItem[] | null {
  if (draft.some((item) => !isValidEventDuration(item.durationMinutes))) return null;
  const currentIndex = draft.findIndex((item) => item.eventId === eventId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= draft.length) return null;
  const reordered = draft.map((item) => ({ ...item }));
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
  return reflowDayPlanDraft(reordered, startTime, gapMinutes, fixedEvents, endTime);
}

export function reflowDayPlanDraft(
  draft: ReadonlyArray<DayPlanDraftItem>,
  startTime: string,
  gapMinutes: number,
  fixedEvents: ReadonlyArray<DayPlanFixedEvent>,
  endTime: string,
): DayPlanDraftItem[] | null {
  if (draft.some((item) => !isValidEventDuration(item.durationMinutes))) return null;
  return buildDayPlanDraft(
    draft.map((item) => ({ id: item.eventId, title: item.title, durationMinutes: item.durationMinutes, travelBufferMinutes: item.travelBufferMinutes })),
    startTime,
    gapMinutes,
    draft[0]?.durationMinutes ?? 60,
    fixedEvents,
    endTime,
  );
}

export function resizeDayPlanDraft(
  draft: ReadonlyArray<DayPlanDraftItem>,
  eventId: string,
  durationMinutes: number,
  startTime: string,
  gapMinutes: number,
  fixedEvents: ReadonlyArray<DayPlanFixedEvent>,
  endTime: string,
): DayPlanDraftItem[] | null {
  if (!isValidEventDuration(durationMinutes) || !draft.some((item) => item.eventId === eventId)) return null;
  return reflowDayPlanDraft(
    draft.map((item) => item.eventId === eventId ? { ...item, durationMinutes } : item),
    startTime,
    gapMinutes,
    fixedEvents,
    endTime,
  );
}
