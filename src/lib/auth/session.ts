import { and, eq, lt, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomToken, sha256Hex } from "../crypto";
import { getDb } from "../db";
import { sessions, users, type Session, type User } from "../db/schema";
import { env } from "../env";

/*
 * Server-side sessions. The browser holds a random 256-bit token in an
 * HttpOnly cookie; the database stores only its SHA-256, so a database leak
 * does not yield usable sessions. Sessions are revocable (logout, "sign out
 * everywhere", password change) and slide forward while in use.
 */

const DAY = 24 * 60 * 60 * 1000;
/** "keep me signed in": 30 days sliding, otherwise 12 hours (shared family devices) */
const LONG_TTL = 30 * DAY;
const SHORT_TTL = 12 * 60 * 60 * 1000;
const MFA_PENDING_TTL = 10 * 60 * 1000;
const ABSOLUTE_MAX = 90 * DAY;

export function cookieSecure(): boolean {
  return env().APP_URL.startsWith("https://");
}

export function sessionCookieName(): string {
  return cookieSecure() ? "__Host-sl_session" : "sl_session";
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "name" | "locale" | "totpEnabled" | "aiConsent" | "createdAt"
>;

export type ValidatedSession = { session: Session; user: SessionUser };

export async function createSession(
  userId: string,
  opts: { remember: boolean; mfaPending: boolean; ip?: string; userAgent?: string },
): Promise<{ token: string; session: Session }> {
  const token = randomToken(32);
  const ttl = opts.mfaPending ? MFA_PENDING_TTL : opts.remember ? LONG_TTL : SHORT_TTL;
  const [session] = await getDb()
    .insert(sessions)
    .values({
      id: sha256Hex(token),
      userId,
      mfaPending: opts.mfaPending,
      remember: opts.remember,
      expiresAt: new Date(Date.now() + ttl),
      ip: opts.ip,
      userAgent: opts.userAgent,
    })
    .returning();
  // Opportunistic cleanup of this user's expired sessions.
  await getDb()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return { token, session };
}

export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  if (!token || token.length > 100) return null;
  const id = sha256Hex(token);
  const rows = await getDb()
    .select({
      session: sessions,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        locale: users.locale,
        totpEnabled: users.totpEnabled,
        aiConsent: users.aiConsent,
        createdAt: users.createdAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  const { session } = row;
  if (session.expiresAt.getTime() <= now || session.createdAt.getTime() + ABSOLUTE_MAX <= now) {
    await getDb().delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (!session.mfaPending) {
    // Slide the expiry forward, at most once every 15 minutes to limit writes.
    const ttl = session.remember ? LONG_TTL : SHORT_TTL;
    if (now - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
      const expiresAt = new Date(now + ttl);
      await getDb()
        .update(sessions)
        .set({ lastSeenAt: new Date(now), expiresAt })
        .where(eq(sessions.id, id));
      session.lastSeenAt = new Date(now);
      session.expiresAt = expiresAt;
    }
  }
  return { session, user: row.user };
}

export async function setSessionCookie(token: string, remember: boolean) {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: LONG_TTL / 1000 } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(sessionCookieName(), "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(sessionCookieName())?.value ?? null;
}

export async function deleteSession(sessionId: string) {
  await getDb().delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteOtherSessions(userId: string, keepSessionId: string) {
  await getDb()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}

export async function deleteAllSessions(userId: string) {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

/** Replace an MFA-pending session with a fully authenticated one. */
export async function upgradeMfaSession(old: Session, remember: boolean) {
  await deleteSession(old.id);
  return createSession(old.userId, {
    remember,
    mfaPending: false,
    ip: old.ip ?? undefined,
    userAgent: old.userAgent ?? undefined,
  });
}

export async function listSessions(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.mfaPending, false), sql`${sessions.expiresAt} > now()`))
    .orderBy(sql`${sessions.lastSeenAt} desc`);
}
