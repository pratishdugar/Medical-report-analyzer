import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env, isProduction } from "../env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as {
  __sehatPool?: Pool;
  __sehatDb?: Db;
  __sehatRlsCheck?: Promise<void>;
};

function getPool(): Pool {
  if (!globalForDb.__sehatPool) {
    globalForDb.__sehatPool = new Pool({
      connectionString: env().DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.__sehatPool;
}

/**
 * Raw database handle. Use ONLY for account/auth tables. Health data must go
 * through `withUser()` so row-level security can scope every query.
 */
export function getDb(): Db {
  if (!globalForDb.__sehatDb) {
    globalForDb.__sehatDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__sehatDb;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Row-level security is silently skipped for superusers and roles with
 * BYPASSRLS. Refuse to serve health data with such a role in production.
 */
async function ensureRlsEnforced(): Promise<void> {
  if (!globalForDb.__sehatRlsCheck) {
    globalForDb.__sehatRlsCheck = (async () => {
      const res = await getPool().query<{ rolsuper: boolean; rolbypassrls: boolean }>(
        "select rolsuper, rolbypassrls from pg_roles where rolname = current_user",
      );
      const row = res.rows[0];
      if (row && (row.rolsuper || row.rolbypassrls)) {
        const msg =
          "[security] The database role can bypass row-level security. Connect with a dedicated " +
          "NOSUPERUSER NOBYPASSRLS role (see docs/SECURITY.md).";
        if (isProduction() && !env().ALLOW_RLS_BYPASS_ROLE) throw new Error(msg);
        console.warn(msg);
      }
    })();
    globalForDb.__sehatRlsCheck.catch(() => {
      globalForDb.__sehatRlsCheck = undefined;
    });
  }
  return globalForDb.__sehatRlsCheck;
}

/** Set the RLS user for the current transaction. */
export async function setUserContext(tx: Tx, userId: string) {
  if (!isUuid(userId)) throw new Error("Invalid user id for RLS context");
  await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
}

/**
 * Run `fn` in a transaction where row-level security exposes only rows owned
 * by `userId`. Forgetting this wrapper yields empty results, never another
 * user's data.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  await ensureRlsEnforced();
  return getDb().transaction(async (tx) => {
    await setUserContext(tx, userId);
    return fn(tx);
  });
}

/**
 * Transaction that can read exactly one share link: the one whose token hash
 * matches. Used by the public doctor-view before the owner is known.
 */
export async function withShareToken<T>(tokenHash: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) throw new Error("Invalid share token hash");
  await ensureRlsEnforced();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.share_token_hash', ${tokenHash}, true)`);
    return fn(tx);
  });
}

export async function closeDb() {
  if (globalForDb.__sehatPool) {
    await globalForDb.__sehatPool.end();
    globalForDb.__sehatPool = undefined;
    globalForDb.__sehatDb = undefined;
    globalForDb.__sehatRlsCheck = undefined;
  }
}

export { schema };
