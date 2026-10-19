import { sql } from "drizzle-orm";
import { sha256Hex } from "../crypto";
import { getDb } from "../db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Fixed-window rate limiter stored in Postgres so it works across instances.
 * Keys are hashed so raw emails/IPs are not stored in this table.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const hashed = sha256Hex(key);
  const res = await getDb().execute<{ count: number; window_start: string }>(sql`
    insert into rate_limits (key, count, window_start)
    values (${hashed}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                   then now() else rate_limits.window_start end
    returning count, window_start
  `);
  const row = res.rows[0];
  const count = Number(row.count);
  const windowStart = new Date(row.window_start).getTime();
  const retryAfterSec = Math.max(1, Math.ceil((windowStart + windowSec * 1000 - Date.now()) / 1000));

  if (Math.random() < 0.01) {
    void getDb()
      .execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`)
      .catch(() => undefined);
  }
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec };
}

export async function resetRateLimit(key: string): Promise<void> {
  await getDb().execute(sql`delete from rate_limits where key = ${sha256Hex(key)}`);
}

/** Named limits used across the app (limit, window seconds). */
export const LIMITS = {
  loginPerIp: [30, 15 * 60],
  loginPerEmail: [8, 15 * 60],
  signupPerIp: [10, 60 * 60],
  resetPerIp: [10, 60 * 60],
  resetPerEmail: [3, 60 * 60],
  mfaPerSession: [6, 10 * 60],
  uploadPerUser: [40, 60 * 60],
  aiPerUser: [30, 60 * 60],
  exportPerUser: [5, 60 * 60],
  sharePerIp: [60, 15 * 60],
  sharePinPerLink: [5, 15 * 60],
} as const satisfies Record<string, readonly [number, number]>;

export async function hit(name: keyof typeof LIMITS, id: string): Promise<RateLimitResult> {
  const [limit, windowSec] = LIMITS[name];
  return rateLimit(`${name}:${id}`, limit, windowSec);
}
