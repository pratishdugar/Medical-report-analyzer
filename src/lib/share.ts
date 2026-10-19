import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { sha256Hex } from "./crypto";
import { setUserContext, withShareToken, type Tx } from "./db";
import { shareLinks, type ShareLink } from "./db/schema";
import { env } from "./env";

/*
 * Doctor share links. The URL carries a 192-bit random token; the database
 * stores only its SHA-256, and RLS lets a visitor read exactly the one link
 * whose hash matches the token they presented. PIN-protected links issue a
 * short-lived HMAC cookie scoped to that link's path after the PIN is entered.
 */

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const PIN_COOKIE_TTL = 2 * 60 * 60; // seconds
export const MAX_PIN_FAILURES = 10;

export type ShareState = "ok" | "unavailable";

export function hashShareToken(token: string): string | null {
  return TOKEN_RE.test(token) ? sha256Hex(token) : null;
}

export function isLinkUsable(link: ShareLink | undefined): link is ShareLink {
  return !!link && !link.revokedAt && link.expiresAt.getTime() > Date.now();
}

function cookieKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", Buffer.from(env().ENCRYPTION_KEY, "base64"), "sehatlens/share", "pin-cookie", 32));
}

export function shareCookieName(linkId: string) {
  return `sl_share_${linkId.replace(/-/g, "").slice(0, 16)}`;
}

export function signShareCookie(linkId: string): string {
  const exp = Math.floor(Date.now() / 1000) + PIN_COOKIE_TTL;
  const mac = createHmac("sha256", cookieKey()).update(`${linkId}.${exp}`).digest("base64url");
  return `${exp}.${mac}`;
}

export function verifyShareCookie(linkId: string, value: string | undefined): boolean {
  if (!value) return false;
  const [expStr, mac] = value.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Date.now() / 1000 || !mac) return false;
  const expected = createHmac("sha256", cookieKey()).update(`${linkId}.${exp}`).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resolve a share token and, if usable, run `fn` with RLS scoped to the link owner. */
export async function withSharedLink<T>(token: string, fn: (tx: Tx, link: ShareLink) => Promise<T>): Promise<{ link: ShareLink; result: T } | null> {
  const hash = hashShareToken(token);
  if (!hash) return null;
  return withShareToken(hash, async (tx) => {
    const [link] = await tx.select().from(shareLinks).where(eq(shareLinks.tokenHash, hash)).limit(1);
    if (!isLinkUsable(link)) return null;
    await setUserContext(tx, link.userId);
    return { link, result: await fn(tx, link) };
  });
}
