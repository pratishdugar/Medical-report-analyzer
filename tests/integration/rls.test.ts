import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession, validateSessionToken } from "@/lib/auth/session";
import { sha256Hex } from "@/lib/crypto";
import { closeDb, getDb, withShareToken, withUser } from "@/lib/db";
import { auditEvents, historyEntries, observations, profiles, reports, shareLinks, users } from "@/lib/db/schema";
import { withSharedLink } from "@/lib/share";

/*
 * These tests run against a real Postgres as a NOSUPERUSER role, proving that
 * row-level security — not just application code — keeps accounts apart.
 */

async function makeUser(label: string) {
  const [u] = await getDb()
    .insert(users)
    .values({ email: `${label}-${crypto.randomUUID()}@test.in`, name: label, passwordHash: "x", consentVersion: "t", consentAt: new Date() })
    .returning();
  const [p] = await withUser(u.id, (tx) => tx.insert(profiles).values({ userId: u.id, name: label, isPrimary: true }).returning());
  const [r] = await withUser(u.id, (tx) =>
    tx.insert(reports).values({ userId: u.id, profileId: p.id, title: `${label} report`, status: "ready" }).returning(),
  );
  await withUser(u.id, (tx) =>
    tx.insert(observations).values({ userId: u.id, profileId: p.id, reportId: r.id, name: "HbA1c", biomarkerCode: "HBA1C", valueNum: 6.1, flag: "high", observedAt: "2026-01-01" }),
  );
  return { user: u, profile: p, report: r };
}

let A: Awaited<ReturnType<typeof makeUser>>;
let B: Awaited<ReturnType<typeof makeUser>>;

beforeAll(async () => {
  const [role] = (await getDb().execute<{ rolsuper: boolean; rolbypassrls: boolean }>(sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`)).rows;
  // The whole point of these tests is that RLS applies; refuse to run as a role that bypasses it.
  expect(role.rolsuper || role.rolbypassrls).toBe(false);
  A = await makeUser("alice");
  B = await makeUser("bob");
});

afterAll(async () => {
  await closeDb();
});

describe("row-level security isolation", () => {
  it("each user only sees their own rows", async () => {
    const seenByB = await withUser(B.user.id, async (tx) => ({
      profiles: await tx.select().from(profiles),
      reports: await tx.select().from(reports),
      observations: await tx.select().from(observations),
    }));
    expect(seenByB.profiles.map((p) => p.id)).toEqual([B.profile.id]);
    expect(seenByB.reports.map((r) => r.id)).toEqual([B.report.id]);
    expect(seenByB.observations.every((o) => o.userId === B.user.id)).toBe(true);
  });

  it("direct lookups of another user's ids return nothing", async () => {
    const rows = await withUser(B.user.id, (tx) => tx.select().from(reports).where(eq(reports.id, A.report.id)));
    expect(rows).toHaveLength(0);
  });

  it("queries without a user context see nothing at all", async () => {
    const rows = await getDb().select().from(observations);
    expect(rows).toHaveLength(0);
    const reps = await getDb().select().from(reports);
    expect(reps).toHaveLength(0);
  });

  it("cannot update or delete another user's rows", async () => {
    const updated = await withUser(B.user.id, (tx) =>
      tx.update(observations).set({ valueNum: 99 }).where(eq(observations.reportId, A.report.id)).returning(),
    );
    expect(updated).toHaveLength(0);
    const deleted = await withUser(B.user.id, (tx) => tx.delete(reports).where(eq(reports.id, A.report.id)).returning());
    expect(deleted).toHaveLength(0);
    const stillThere = await withUser(A.user.id, (tx) => tx.select().from(observations).where(eq(observations.reportId, A.report.id)));
    expect(stillThere[0].valueNum).toBe(6.1);
  });

  it("cannot insert rows owned by someone else", async () => {
    await expect(
      withUser(B.user.id, (tx) => tx.insert(profiles).values({ userId: A.user.id, name: "intruder" })),
    ).rejects.toThrow();
  });

  it("cannot attach own rows to another user's profile or report (composite FKs)", async () => {
    await expect(
      withUser(B.user.id, (tx) =>
        tx.insert(observations).values({ userId: B.user.id, profileId: A.profile.id, name: "x", valueNum: 1, observedAt: "2026-01-01" }),
      ),
    ).rejects.toThrow();
    await expect(
      withUser(B.user.id, (tx) =>
        tx.insert(observations).values({ userId: B.user.id, profileId: B.profile.id, reportId: A.report.id, name: "x", valueNum: 1, observedAt: "2026-01-01" }),
      ),
    ).rejects.toThrow();
  });

  it("history and audit tables are isolated too", async () => {
    await withUser(A.user.id, (tx) => tx.insert(historyEntries).values({ userId: A.user.id, profileId: A.profile.id, type: "condition", title: "Diabetes" }));
    await withUser(A.user.id, (tx) => tx.insert(auditEvents).values({ userId: A.user.id, action: "login" }));
    const seen = await withUser(B.user.id, async (tx) => [...(await tx.select().from(historyEntries)), ...(await tx.select().from(auditEvents))]);
    expect(seen).toHaveLength(0);
  });

  it("rejects malformed user ids for the RLS context", async () => {
    await expect(withUser("' or 1=1 --", async () => 1)).rejects.toThrow();
  });
});

describe("share links", () => {
  it("a share token exposes exactly one link and only its profile", async () => {
    const token = "test-token-abcdefghijklmnopqrstuvwxyz";
    await withUser(A.user.id, (tx) =>
      tx.insert(shareLinks).values({ userId: A.user.id, profileId: A.profile.id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) }),
    );
    await withUser(B.user.id, (tx) =>
      tx.insert(shareLinks).values({ userId: B.user.id, profileId: B.profile.id, tokenHash: sha256Hex("bob-token-abcdefghijklmnopqrstuvwxyz"), expiresAt: new Date(Date.now() + 3600_000) }),
    );
    // With only the token context (no owner yet) a visitor sees exactly the matching link.
    const visible = await withShareToken(sha256Hex(token), (tx) => tx.select().from(shareLinks));
    expect(visible).toHaveLength(1);
    expect(visible[0].userId).toBe(A.user.id);
    const viaHelper = await withSharedLink(token, async (tx, link) => tx.select().from(reports).where(eq(reports.profileId, link.profileId)));
    expect(viaHelper?.result.map((r) => r.id)).toEqual([A.report.id]);
    expect(await withSharedLink("wrong-token-abcdefghijklmnopqrstuvwxyz", async () => 1)).toBeNull();
  });

  it("expired and revoked links resolve to nothing", async () => {
    const token = "expired-token-abcdefghijklmnopqrstuvwxyz";
    await withUser(A.user.id, (tx) =>
      tx.insert(shareLinks).values({ userId: A.user.id, profileId: A.profile.id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() - 1000) }),
    );
    expect(await withSharedLink(token, async () => 1)).toBeNull();
  });
});

describe("sessions and rate limits", () => {
  it("stores only token hashes and validates sessions", async () => {
    const { token, session } = await createSession(A.user.id, { remember: false, mfaPending: false });
    expect(session.id).toBe(sha256Hex(token));
    expect(session.id).not.toContain(token);
    const v = await validateSessionToken(token);
    expect(v?.user.id).toBe(A.user.id);
    expect(await validateSessionToken(`${token}x`)).toBeNull();
  });

  it("limits after the configured number of hits", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rateLimit(key, 3, 60)).ok);
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("account deletion", () => {
  it("cascades to every health table", async () => {
    const C = await makeUser("carol");
    await getDb().delete(users).where(eq(users.id, C.user.id));
    const left = await withUser(C.user.id, async (tx) => [
      ...(await tx.select().from(profiles)),
      ...(await tx.select().from(reports)),
      ...(await tx.select().from(observations)),
    ]);
    expect(left).toHaveLength(0);
    // Verify with the owner's own context too: nothing remains for that id.
    const raw = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from users where id = ${C.user.id}`);
    expect(raw.rows[0].n).toBe(0);
  });
});
