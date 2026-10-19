import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Recreate the test database schema (tables + RLS policies) before the run. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgres://sehat:sehat@localhost:5432/sehat_test";
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query("drop owned by current_user cascade");
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
