import { randomUUID } from 'node:crypto';
import { AiExecutionError } from './aiExecutionError.ts';
import { logOperationalWarning } from '../observability/safeLogger.ts';
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

type Environment = Partial<Record<'NODE_ENV' | 'HAPPYDATE_AI_TEST_SESSION_ID' | 'VERCEL' | 'VERCEL_ENV' | 'VERCEL_TARGET_ENV' | 'VERCEL_GIT_COMMIT_SHA' | 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN', string>>;
export type HostedSessionPermit = { finish(usage: AiTokenUsage | null, dailySettled: boolean): Promise<void> };
export function isAiEgressDenied(): boolean {
  return process.env.SEC01_DENY_AI_EGRESS === '1';
}

const unavailable = () => new AiExecutionError('service_unavailable', 503);

/** Deployment identity comes from server configuration, never request headers or payload. */
export function readHostedSessionConfig(env: Environment = process.env as Environment) {
  const { NODE_ENV, VERCEL, VERCEL_ENV, VERCEL_TARGET_ENV, VERCEL_GIT_COMMIT_SHA: sha, HAPPYDATE_AI_TEST_SESSION_ID: id } = env;
  // vercel dev and local tooling may use local controls, but partial hosted identity cannot.
  if (NODE_ENV !== 'production' && id === undefined && (
    [VERCEL, VERCEL_ENV, VERCEL_TARGET_ENV, sha].every(value => value === undefined) ||
    (NODE_ENV === 'development' && VERCEL_ENV === 'development' && VERCEL_TARGET_ENV === 'development' && (VERCEL === undefined || VERCEL === '1'))
  )) return null;

  if (NODE_ENV !== 'production' || VERCEL !== '1' || VERCEL_TARGET_ENV !== VERCEL_ENV ||
      !sha || !/^[a-f0-9]{40}$/.test(sha) || /^0+$/.test(sha)) throw unavailable();
  if (VERCEL_ENV === 'production' && id === undefined) return null;
  if (VERCEL_ENV !== 'preview' || !id || !/^sec01-[a-z0-9-]{16,80}$/.test(id)) throw unavailable();

  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!token || !env.UPSTASH_REDIS_REST_URL) throw unavailable();
  let url: URL;
  try { url = new URL(env.UPSTASH_REDIS_REST_URL); }
  catch { throw unavailable(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw unavailable();
  return { key: `sec01:session:${id}`, sha, token, url };
}

export async function reserveHostedTestSession(inputTokens: number, maxOutputTokens: number, env: Environment = process.env as Environment): Promise<HostedSessionPermit | null> {
  const config = readHostedSessionConfig(env);
  if (!config) return null;
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 1 || inputTokens > 20480 || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 2000) throw unavailable();
  const { key, sha, token, url } = config;
  async function command(script: string, args: (string | number)[]) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', script, 1, key, ...args]), signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!response.ok) throw unavailable();
      const body = await response.json() as { result?: unknown; error?: unknown };
      if (body.error || !Number.isSafeInteger(body.result)) throw unavailable();
      return Number(body.result);
    } catch { throw unavailable(); }
  }
  const nonce = randomUUID();
  const attempt = await command(SESSION_RESERVE_LUA, [sha, inputTokens + 4 * maxOutputTokens, nonce]);
  if (attempt < 1 || attempt > 8) {
    if (attempt === 0 && isAiEgressDenied()) {
      logOperationalWarning('ai-session', 'redis-session-denied-with-egress-disabled');
    }
    throw unavailable();
  }
  let finished = false;
  return { finish: async (usage, dailySettled) => {
    if (finished) return;
    finished = true; // Ambiguous response is never retried; pending state blocks further calls.
    const actual = usage ? costUnits(usage) : -1;
    if (await command(SESSION_FINISH_LUA, [nonce, actual, dailySettled && usage !== null ? '1' : '0', usage?.inputTokens ?? -1, usage?.outputTokens ?? -1]) !== 1) throw unavailable();
  } };
}
