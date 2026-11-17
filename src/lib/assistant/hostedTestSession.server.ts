import { randomUUID } from 'node:crypto';
import { AiExecutionError } from './aiExecutionError.ts';
import { costUnits, type AiTokenUsage } from './aiBudget.ts';

// Seed/ACK are operator-only operations; the application never initializes or resets a session.
export const SESSION_RESERVE_LUA = `
local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end
local s=cjson.decode(raw); local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if s.version~=1 or s.sha~=ARGV[1] or s.status~='active' or type(s.deadline)~='number' or s.deadline<=now then return 0 end
if type(s.calls)~='number' or s.calls<0 or s.calls~=math.floor(s.calls) or s.calls>=8 then return 0 end
if type(s.units)~='number' or s.units<0 or s.units~=math.floor(s.units) or s.pending~=false then return 0 end
local delta=tonumber(ARGV[2]); if not delta or delta<=0 or s.units+delta>250000 or redis.call('PTTL',KEYS[1])<=0 then return 0 end
s.calls=s.calls+1; s.units=s.units+delta; s.pending=ARGV[3]; s.outcome='awaiting'; s.reserved=delta
redis.call('SET',KEYS[1],cjson.encode(s),'KEEPTTL'); return s.calls
`;
export const SESSION_FINISH_LUA = `
local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end
local s=cjson.decode(raw)
if s.pending~=ARGV[1] or s.outcome~='awaiting' or s.status~='active' or redis.call('PTTL',KEYS[1])<=0 then return 0 end
local actual=tonumber(ARGV[2]); if ARGV[3]~='1' or not actual or actual<0 or actual>s.reserved then s.status='blocked'; s.outcome='ambiguous'
else s.outcome='measured'; s.actual=actual; s.inputTokens=tonumber(ARGV[4]); s.outputTokens=tonumber(ARGV[5]) end
redis.call('SET',KEYS[1],cjson.encode(s),'KEEPTTL'); return 1
`;
// Independent usage reconciliation must precede this compare-and-set, never an app/public route.
// Caller supplies the exact pending nonce and cumulative provider attempt count after checking receipts.
export const SESSION_ACK_LUA = `
local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end
local s=cjson.decode(raw); local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if s.sha~=ARGV[1] or s.status~='active' or s.deadline<=now or s.pending~=ARGV[2] or s.outcome~='measured' or s.calls~=tonumber(ARGV[3]) or redis.call('PTTL',KEYS[1])<=0 then return 0 end
if s.calls>=8 then s.status='closed' else s.pending=false end
redis.call('SET',KEYS[1],cjson.encode(s),'KEEPTTL'); return 1
`;

type Environment = Partial<Record<'HAPPYDATE_AI_TEST_SESSION_ID' | 'VERCEL_ENV' | 'VERCEL_GIT_COMMIT_SHA' | 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN', string>>;
export type HostedSessionPermit = { finish(usage: AiTokenUsage | null, dailySettled: boolean): Promise<void> };
const unavailable = () => new AiExecutionError('service_unavailable', 503);
export async function reserveHostedTestSession(inputTokens: number, maxOutputTokens: number, env: Environment = process.env as Environment): Promise<HostedSessionPermit | null> {
  const id = env.HAPPYDATE_AI_TEST_SESSION_ID;
  if (id === undefined) {
    if (env.VERCEL_ENV === 'preview') throw unavailable();
    return null; // Existing Production/local behavior unchanged; Preview never bypasses a missing ID.
  }
  if (!/^sec01-[a-z0-9-]{16,80}$/.test(id) || env.VERCEL_ENV !== 'preview' || !/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? '') || !env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN || !Number.isSafeInteger(inputTokens) || inputTokens < 1 || inputTokens > 20480 || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 2000) throw unavailable();
  const key = `sec01:session:${id}`;
  async function command(script: string, args: (string | number)[]) {
    try {
      const url = new URL(env.UPSTASH_REDIS_REST_URL!);
      if (url.protocol !== 'https:' || url.username || url.password) throw unavailable();
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', script, 1, key, ...args]), signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!response.ok) throw unavailable();
      const body = await response.json() as { result?: unknown; error?: unknown };
      if (body.error || !Number.isSafeInteger(body.result)) throw unavailable();
      return Number(body.result);
    } catch { throw unavailable(); }
  }
  const nonce = randomUUID();
  const attempt = await command(SESSION_RESERVE_LUA, [env.VERCEL_GIT_COMMIT_SHA!, inputTokens + 4 * maxOutputTokens, nonce]);
  if (attempt < 1 || attempt > 8) throw unavailable();
  let finished = false;
  return { finish: async (usage, dailySettled) => {
    if (finished) return;
    finished = true; // Ambiguous response is never retried; pending state blocks further calls.
    const actual = usage ? costUnits(usage) : -1;
    if (await command(SESSION_FINISH_LUA, [nonce, actual, dailySettled && usage !== null ? '1' : '0', usage?.inputTokens ?? -1, usage?.outputTokens ?? -1]) !== 1) throw unavailable();
  } };
}
