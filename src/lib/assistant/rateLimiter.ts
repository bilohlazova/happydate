import { ASSISTANT_CHAT_CONFIG, ASSISTANT_RATE_LIMITS, type AssistantIdentityKind } from "./chatConfig.ts";

export interface AssistantRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface AssistantRateLimiter {
  check(key: string, kind: AssistantIdentityKind): Promise<AssistantRateLimitResult>;
  acquire?(key: string): Promise<(() => Promise<void>) | null>;
}

type MemoryEntry = { count: number; resetAt: number; active: number };

export class MemoryAssistantRateLimiter implements AssistantRateLimiter {
  private readonly entries = new Map<string, MemoryEntry>();

  async check(key: string, kind: AssistantIdentityKind): Promise<AssistantRateLimitResult> {
    const now = Date.now();
    const policy = ASSISTANT_RATE_LIMITS[kind];
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + policy.windowSeconds * 1_000, active: 0 };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= policy.requests,
      remaining: Math.max(0, policy.requests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  async acquire(key: string): Promise<(() => Promise<void>) | null> {
    const entry = this.entries.get(key) ?? { count: 0, resetAt: Date.now() + 60_000, active: 0 };
    this.entries.set(key, entry);
    if (entry.active >= ASSISTANT_CHAT_CONFIG.concurrentRequests) return null;
    entry.active += 1;
    let released = false;
    return async () => {
      if (!released) entry.active = Math.max(0, entry.active - 1);
      released = true;
    };
  }
}

type UpstashResult = { result?: unknown; error?: string };

export class UpstashAssistantRateLimiter implements AssistantRateLimiter {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async command(command: unknown[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("rate_limiter_unavailable");
    const body = await response.json() as UpstashResult;
    if (body.error) throw new Error("rate_limiter_unavailable");
    return body.result;
  }

  async check(key: string, kind: AssistantIdentityKind): Promise<AssistantRateLimitResult> {
    const policy = ASSISTANT_RATE_LIMITS[kind];
    const bucket = `assistant:rate:${key}:${Math.floor(Date.now() / (policy.windowSeconds * 1_000))}`;
    const count = Number(await this.command(["INCR", bucket]));
    if (count === 1) await this.command(["EXPIRE", bucket, policy.windowSeconds]);
    const ttl = Math.max(1, Number(await this.command(["TTL", bucket])) || policy.windowSeconds);
    return {
      allowed: count <= policy.requests,
      remaining: Math.max(0, policy.requests - count),
      resetAt: Date.now() + ttl * 1_000,
    };
  }

  async acquire(key: string): Promise<(() => Promise<void>) | null> {
    const token = crypto.randomUUID();
    for (let slot = 0; slot < ASSISTANT_CHAT_CONFIG.concurrentRequests; slot += 1) {
      const lockKey = `assistant:active:${key}:${slot}`;
      const acquired = await this.command([
        "SET", lockKey, token, "NX", "EX", ASSISTANT_CHAT_CONFIG.concurrentLeaseSeconds,
      ]);
      if (acquired === "OK") {
        return async () => {
          await this.command([
            "EVAL",
            "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
            1,
            lockKey,
            token,
          ]).catch(() => undefined);
        };
      }
    }
    return null;
  }
}

let developmentLimiter: MemoryAssistantRateLimiter | undefined;

export function createConfiguredAssistantRateLimiter(): AssistantRateLimiter | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) return new UpstashAssistantRateLimiter(url, token);
  if (process.env.NODE_ENV !== "production") {
    developmentLimiter ??= new MemoryAssistantRateLimiter();
    return developmentLimiter;
  }
  return null;
}
