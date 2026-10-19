import { Pool } from "pg";

/**
 * Local e2e runs create several accounts from one IP, which (correctly) trips
 * the sign-up rate limiter. When pointed at a database, clear the counters.
 */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) return;
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query("delete from rate_limits");
  } finally {
    await pool.end();
  }
}
