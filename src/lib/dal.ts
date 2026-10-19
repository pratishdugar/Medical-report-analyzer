import "server-only";
import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readSessionToken, validateSessionToken, type ValidatedSession } from "./auth/session";
import { getDb, isUuid, withUser } from "./db";
import { profiles, users, type Profile } from "./db/schema";

/*
 * Data Access Layer: the single place pages and actions get the current user
 * from. Every health-data read/write goes through withUser(user.id), so row-
 * level security scopes it to the signed-in account. The user id always comes
 * from the server-side session, never from the client.
 */

export const getSession = cache(async (): Promise<ValidatedSession | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
});

export async function requireUser(): Promise<ValidatedSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.session.mfaPending) redirect("/login/verify");
  return s;
}

export const PROFILE_COOKIE = "sl_profile";

export const getProfiles = cache(async (userId: string): Promise<Profile[]> =>
  withUser(userId, (tx) => tx.select().from(profiles).orderBy(asc(profiles.createdAt))),
);

/** Currently selected family member (cookie), falling back to the primary profile. */
export const getActiveProfile = cache(async (userId: string): Promise<{ active: Profile; all: Profile[] }> => {
  let all = await getProfiles(userId);
  if (!all.length) {
    // Self-heal: every account needs at least one profile (normally created at sign-up).
    const [u] = await getDb().select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    await withUser(userId, (tx) => tx.insert(profiles).values({ userId, name: u?.name ?? "Me", relation: "self", isPrimary: true }));
    all = await withUser(userId, (tx) => tx.select().from(profiles).orderBy(asc(profiles.createdAt)));
  }
  const selected = (await cookies()).get(PROFILE_COOKIE)?.value;
  const active =
    (selected && isUuid(selected) && all.find((p) => p.id === selected)) || all.find((p) => p.isPrimary) || all[0];
  return { active, all };
});

export async function getOwnedProfile(userId: string, profileId: string): Promise<Profile | null> {
  if (!isUuid(profileId)) return null;
  const rows = await withUser(userId, (tx) => tx.select().from(profiles).where(eq(profiles.id, profileId)).limit(1));
  return rows[0] ?? null;
}
