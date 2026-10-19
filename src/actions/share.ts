"use server";

import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hit } from "@/lib/auth/rate-limit";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { getOwnedProfile, requireUser } from "@/lib/dal";
import { isUuid, withShareToken, withUser } from "@/lib/db";
import { shareLinks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { requestMeta } from "@/lib/request";
import { hashShareToken, isLinkUsable, MAX_PIN_FAILURES, PIN_COOKIE_TTL, shareCookieName, signShareCookie } from "@/lib/share";
import { checkbox, str, type ActionState } from "@/lib/validation";

export async function createShareAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const profile = await getOwnedProfile(user.id, str(fd, "profileId"));
  if (!profile) return { error: "common.notFound" };
  const days = [1, 7, 30].includes(Number(str(fd, "days"))) ? Number(str(fd, "days")) : 7;
  const usePin = checkbox.parse(fd.get("pin"));
  const includeFiles = checkbox.parse(fd.get("files"));
  const token = randomToken(24);
  const pin = usePin ? String(randomInt(0, 1_000_000)).padStart(6, "0") : null;
  const expiresAt = new Date(Date.now() + days * 86400_000);
  await withUser(user.id, async (tx) => {
    await tx.insert(shareLinks).values({
      userId: user.id,
      profileId: profile.id,
      tokenHash: sha256Hex(token),
      pinHash: pin ? await hashPassword(pin) : null,
      label: str(fd, "label").trim().slice(0, 60) || null,
      includeFiles,
      expiresAt,
    });
    await logAudit(tx, user.id, "share_created", { ...(await requestMeta()), days, pin: usePin, files: includeFiles });
  });
  revalidatePath("/share");
  return { ok: true, data: { url: `${env().APP_URL}/s/${token}`, pin, expiresAt: expiresAt.toISOString() } };
}

export async function revokeShareAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  if (isUuid(id)) {
    await withUser(user.id, async (tx) => {
      await tx.update(shareLinks).set({ revokedAt: new Date() }).where(eq(shareLinks.id, id));
      await logAudit(tx, user.id, "share_revoked", await requestMeta());
    });
  }
  revalidatePath("/share");
}

/** Doctor enters the PIN for a share link. */
export async function verifySharePinAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const hash = hashShareToken(token);
  if (!hash) return { error: "shared.unavailable" };
  const meta = await requestMeta();
  const [ipLimit, linkLimit] = await Promise.all([hit("sharePerIp", meta.ip), hit("sharePinPerLink", hash)]);
  if (!ipLimit.ok || !linkLimit.ok) return { error: "common.rateLimited" };
  const pin = str(fd, "pin").replace(/\D/g, "").slice(0, 6);

  const outcome = await withShareToken(hash, async (tx) => {
    const [link] = await tx.select().from(shareLinks).where(eq(shareLinks.tokenHash, hash)).limit(1);
    if (!isLinkUsable(link) || !link.pinHash) return { error: "shared.unavailable" as const };
    if (link.failedPinCount >= MAX_PIN_FAILURES) return { error: "shared.locked" as const };
    if (pin.length !== 6 || !(await verifyPassword(link.pinHash, pin))) {
      const failures = link.failedPinCount + 1;
      await tx
        .update(shareLinks)
        .set({ failedPinCount: failures, ...(failures >= MAX_PIN_FAILURES ? { revokedAt: new Date() } : {}) })
        .where(eq(shareLinks.id, link.id));
      return { error: failures >= MAX_PIN_FAILURES ? ("shared.locked" as const) : ("shared.wrongPin" as const) };
    }
    await tx
      .update(shareLinks)
      .set({ accessCount: sql`${shareLinks.accessCount} + 1`, lastAccessedAt: new Date() })
      .where(eq(shareLinks.id, link.id));
    return { link };
  });
  if ("error" in outcome) return { error: outcome.error };
  await audit(outcome.link.userId, "share_accessed", { ip: meta.ip, userAgent: meta.userAgent });
  (await cookies()).set(shareCookieName(outcome.link.id), signShareCookie(outcome.link.id), {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "strict",
    path: `/`,
    maxAge: PIN_COOKIE_TTL,
  });
  redirect(`/s/${token}`);
}
