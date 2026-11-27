import type { ProactiveResult } from "./proactive-rules.ts";

// HD-PR-007. PostgREST receives `.in()` filters in the request URL, and a long
// list overflows the gateway's URL limit (measured on staging: 30 events work,
// 60 fail). Lists are therefore sent in chunks bounded by encoded length and by
// item count, and results are never read past PostgREST's silent row cap.
export const IN_FILTER_MAX_ENCODED_CHARS = 6_000;
export const IN_FILTER_MAX_ITEMS = 100;
// Supabase's default `max_rows`; a response of exactly this size may have been
// truncated by the API, so it is treated as an error instead of a result.
export const POSTGREST_MAX_ROWS = 1_000;
export const PROACTIVE_MAX_PAGES_PER_RUN = 100;
export const PROACTIVE_RUN_TIME_BUDGET_MS = 100_000;

export class ProactiveReadError extends Error {
  readonly table: string;
  constructor(table: string, reason: string) {
    super(`proactive_read_failed.${table}.${reason}`);
    this.name = "ProactiveReadError";
    this.table = table;
  }
}

export function chunkByEncodedLength(
  values: readonly string[],
  maxEncodedChars = IN_FILTER_MAX_ENCODED_CHARS,
  maxItems = IN_FILTER_MAX_ITEMS,
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLength = 0;
  for (const value of values) {
    const cost = encodeURIComponent(value).length + 3; // value plus an encoded comma
    if (current.length > 0 && (current.length >= maxItems || currentLength + cost > maxEncodedChars)) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(value);
    currentLength += cost;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

type QueryOutcome<T> = { data: T[] | null; error: unknown };

export async function selectInChunks<T>(
  table: string,
  values: readonly string[],
  run: (chunk: string[]) => PromiseLike<QueryOutcome<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (const chunk of chunkByEncodedLength(values)) {
    let outcome: QueryOutcome<T>;
    try {
      outcome = await run(chunk);
    } catch {
      throw new ProactiveReadError(table, "request");
    }
    if (outcome.error) throw new ProactiveReadError(table, "query");
    const data = outcome.data ?? [];
    if (data.length >= POSTGREST_MAX_ROWS) throw new ProactiveReadError(table, "row_cap");
    rows.push(...data);
  }
  return rows;
}

export function emptyProactiveResult(): ProactiveResult {
  return {
    scannedCandidates: 0,
    ideasCreated: { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 },
    notificationsCreated: { giftMissing: 0 },
    skipped: { giftPrepared: 0, activeTask: 0, greetingPrepared: 0, existingIdea: 0, invalidTarget: 0 },
  };
}

export function mergeProactiveResults(total: ProactiveResult, page: ProactiveResult): ProactiveResult {
  total.scannedCandidates += page.scannedCandidates;
  total.ideasCreated.startGiftPlanning += page.ideasCreated.startGiftPlanning;
  total.ideasCreated.giftHelp += page.ideasCreated.giftHelp;
  total.ideasCreated.prepareGreeting += page.ideasCreated.prepareGreeting;
  total.notificationsCreated.giftMissing += page.notificationsCreated.giftMissing;
  total.skipped.giftPrepared += page.skipped.giftPrepared;
  total.skipped.activeTask += page.skipped.activeTask;
  total.skipped.greetingPrepared += page.skipped.greetingPrepared;
  total.skipped.existingIdea += page.skipped.existingIdea;
  total.skipped.invalidTarget += page.skipped.invalidTarget;
  return total;
}

export type EventCursor = { date: string; id: string };

export function eventCursorFilter(cursor: EventCursor): string {
  // The cursor comes from a database row, but it is validated anyway because it
  // is interpolated into a PostgREST filter expression.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cursor.date) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id)) {
    throw new ProactiveReadError("events", "cursor");
  }
  return `date.gt.${cursor.date},and(date.eq.${cursor.date},id.gt.${cursor.id})`;
}
