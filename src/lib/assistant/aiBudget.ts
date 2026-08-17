export const AI_COST_POLICY = Object.freeze({
  version: "gpt-4.1-mini-standard-2026-08-16",
  model: "gpt-4.1-mini",
  inputUsdPerMillion: 0.4,
  outputUsdPerMillion: 1.6,
  outputWeight: 4,
} as const);

export type AiTokenUsage = { inputTokens: number; outputTokens: number };
export type AiBudgetReservation = {
  reservedCostUnits: number;
  settle(usage: AiTokenUsage): Promise<void>;
};
export type AiBudgetResult =
  | { allowed: true; reservation: AiBudgetReservation }
  | { allowed: false; retryAfterSeconds: number };

export interface AiBudget {
  reserve(estimatedInputTokens: number, maxOutputTokens: number): Promise<AiBudgetResult>;
}

const MIN_DAILY_USD = 0.1;
const MAX_DAILY_USD = 1_000;

export function parseDailyAiBudgetUsd(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= MIN_DAILY_USD && parsed <= MAX_DAILY_USD
    ? parsed
    : null;
}

export function estimateInputTokens(messages: readonly { content: string }[]): number {
  // Every tokenizer token maps to at least one input byte; reserving UTF-8
  // bytes plus framing overhead is intentionally more conservative than the
  // usual chars/4 display estimate and remains safe for every product locale.
  const bytes = messages.reduce(
    (total, { content }) => total + new TextEncoder().encode(content).byteLength,
    0,
  );
  return Math.max(1, bytes + messages.length * 16 + 128);
}

export function costUnits({ inputTokens, outputTokens }: AiTokenUsage): number {
  return Math.max(0, Math.ceil(inputTokens))
    + Math.max(0, Math.ceil(outputTokens)) * AI_COST_POLICY.outputWeight;
}

export function estimatedUsd(usage: AiTokenUsage): number {
  return (
    Math.max(0, usage.inputTokens) * AI_COST_POLICY.inputUsdPerMillion
    + Math.max(0, usage.outputTokens) * AI_COST_POLICY.outputUsdPerMillion
  ) / 1_000_000;
}

function dailyCostUnitLimit(dailyUsd: number): number {
  return Math.floor(dailyUsd * 1_000_000 / AI_COST_POLICY.inputUsdPerMillion);
}

function secondsUntilNextUtcDay(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1_000));
}

export class MemoryAiBudget implements AiBudget {
  private day = "";
  private used = 0;
  private readonly dailyUsd: number;
  private readonly now: () => Date;

  constructor(dailyUsd: number, now: () => Date = () => new Date()) {
    this.dailyUsd = dailyUsd;
    this.now = now;
  }

  async reserve(estimatedInputTokens: number, maxOutputTokens: number): Promise<AiBudgetResult> {
    const now = this.now();
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
    const reservedCostUnits = costUnits({ inputTokens: estimatedInputTokens, outputTokens: maxOutputTokens });
    if (this.used + reservedCostUnits > dailyCostUnitLimit(this.dailyUsd)) {
      return { allowed: false, retryAfterSeconds: secondsUntilNextUtcDay(now) };
    }
    this.used += reservedCostUnits;
    let settled = false;
    return {
      allowed: true,
      reservation: {
        reservedCostUnits,
        settle: async (usage) => {
          if (settled) return;
          settled = true;
          this.used = Math.max(0, this.used + costUnits(usage) - reservedCostUnits);
        },
      },
    };
  }
}

type UpstashResult = { result?: unknown; error?: string };

export class UpstashAiBudget implements AiBudget {
  private readonly url: string;
  private readonly token: string;
  private readonly dailyUsd: number;
  private readonly now: () => Date;

  constructor(
    url: string,
    token: string,
    dailyUsd: number,
    now: () => Date = () => new Date(),
  ) {
    this.url = url;
    this.token = token;
    this.dailyUsd = dailyUsd;
    this.now = now;
  }

  private async command(command: unknown[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("ai_budget_unavailable");
    const body = await response.json() as UpstashResult;
    if (body.error) throw new Error("ai_budget_unavailable");
    return body.result;
  }

  async reserve(estimatedInputTokens: number, maxOutputTokens: number): Promise<AiBudgetResult> {
    const now = this.now();
    const key = `ai:daily-cost:${now.toISOString().slice(0, 10)}`;
    const reservedCostUnits = costUnits({ inputTokens: estimatedInputTokens, outputTokens: maxOutputTokens });
    const ttl = secondsUntilNextUtcDay(now) + 300;
    const result = await this.command([
      "EVAL",
      "local c=tonumber(redis.call('get',KEYS[1]) or '0'); local a=tonumber(ARGV[1]); local l=tonumber(ARGV[2]); if c+a>l then return {0,c} end; local n=redis.call('incrby',KEYS[1],a); if c==0 then redis.call('expire',KEYS[1],ARGV[3]) end; return {1,n}",
      1,
      key,
      reservedCostUnits,
      dailyCostUnitLimit(this.dailyUsd),
      ttl,
    ]);
    if (!Array.isArray(result) || Number(result[0]) !== 1) {
      return { allowed: false, retryAfterSeconds: secondsUntilNextUtcDay(now) };
    }
    let settled = false;
    return {
      allowed: true,
      reservation: {
        reservedCostUnits,
        settle: async (usage) => {
          if (settled) return;
          settled = true;
          const delta = costUnits(usage) - reservedCostUnits;
          if (delta === 0) return;
          await this.command([
            "EVAL",
            "local c=tonumber(redis.call('get',KEYS[1]) or '0'); local d=tonumber(ARGV[1]); local n=c+d; if n<0 then n=0 end; redis.call('set',KEYS[1],n,'KEEPTTL'); return n",
            1,
            key,
            delta,
          ]);
        },
      },
    };
  }
}

type AiBudgetEnvironment = Partial<Record<
  "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN" | "OPENAI_DAILY_BUDGET_USD",
  string | undefined
>>;

let developmentBudget: MemoryAiBudget | undefined;

export function createConfiguredAiBudget(
  environment: AiBudgetEnvironment = process.env as AiBudgetEnvironment,
  nodeEnvironment = process.env.NODE_ENV,
): AiBudget | null {
  const dailyUsd = parseDailyAiBudgetUsd(environment.OPENAI_DAILY_BUDGET_USD)
    ?? (nodeEnvironment === "production" ? null : 2);
  if (dailyUsd === null) return null;
  const url = environment.UPSTASH_REDIS_REST_URL?.trim();
  const token = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) return new UpstashAiBudget(url, token, dailyUsd);
  if (nodeEnvironment !== "production") {
    developmentBudget ??= new MemoryAiBudget(dailyUsd);
    return developmentBudget;
  }
  return null;
}
