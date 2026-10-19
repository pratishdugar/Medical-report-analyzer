"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { hit } from "@/lib/auth/rate-limit";
import { clearSessionCookie, deleteAllSessions, deleteOtherSessions } from "@/lib/auth/session";
import { generateRecoveryCodes, generateTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import { aad, decryptText, encryptText } from "@/lib/crypto";
import { PROFILE_COOKIE, requireUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { requestMeta } from "@/lib/request";
import { deleteAllUserFiles } from "@/lib/storage";
import { checkbox, str, type ActionState } from "@/lib/validation";

async function loadUser(id: string) {
  const [u] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return u;
}

export async function updateAccountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const name = z.string().trim().min(1).max(100).safeParse(str(fd, "name"));
  if (!name.success) return { fieldErrors: { name: "auth.errors.nameRequired" } };
  const locale = normalizeLocale(str(fd, "locale"));
  await getDb().update(users).set({ name: name.data, locale, updatedAt: new Date() }).where(eq(users.id, user.id));
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true, message: "common.save" };
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, session } = await requireUser();
  if (!(await hit("loginPerEmail", user.email)).ok) return { error: "common.rateLimited" };
  const u = await loadUser(user.id);
  if (!u || !(await verifyPassword(u.passwordHash, str(fd, "current")))) return { fieldErrors: { current: "auth.errors.invalid" } };
  const next = str(fd, "password").slice(0, 200);
  const problem = checkPasswordStrength(next, u.email);
  if (problem) return { fieldErrors: { password: `auth.errors.${problem}` } };
  await getDb().update(users).set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, u.id));
  await deleteOtherSessions(u.id, session.id);
  await audit(u.id, "password_changed", await requestMeta());
  return { ok: true, message: "settings.passwordChanged" };
}

export async function startTotpAction(): Promise<ActionState> {
  const { user } = await requireUser();
  const u = await loadUser(user.id);
  if (!u || u.totpEnabled) return { error: "common.genericError" };
  const secret = generateTotpSecret();
  await getDb().update(users).set({ totpSecretEnc: encryptText(u.id, secret, aad.userTotp(u.id)) }).where(eq(users.id, u.id));
  const qr = await QRCode.toDataURL(totpUri(secret, u.email), { margin: 1, width: 220 });
  return { ok: true, data: { qr, secret } };
}

export async function confirmTotpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, session } = await requireUser();
  if (!(await hit("mfaPerSession", session.id)).ok) return { error: "common.rateLimited" };
  const u = await loadUser(user.id);
  if (!u?.totpSecretEnc || u.totpEnabled) return { error: "common.genericError" };
  if (!verifyTotp(decryptText(u.id, u.totpSecretEnc, aad.userTotp(u.id)), str(fd, "code"))) return { error: "auth.errors.invalidCode" };
  const { codes, hashes } = generateRecoveryCodes();
  await getDb().update(users).set({ totpEnabled: true, recoveryCodes: hashes, updatedAt: new Date() }).where(eq(users.id, u.id));
  await deleteOtherSessions(u.id, session.id);
  await audit(u.id, "mfa_enabled", await requestMeta());
  return { ok: true, data: { codes } };
}

export async function disableTotpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user, session } = await requireUser();
  if (!(await hit("mfaPerSession", session.id)).ok) return { error: "common.rateLimited" };
  const u = await loadUser(user.id);
  if (!u?.totpEnabled || !u.totpSecretEnc) return { error: "common.genericError" };
  const okPassword = await verifyPassword(u.passwordHash, str(fd, "password"));
  const okCode = verifyTotp(decryptText(u.id, u.totpSecretEnc, aad.userTotp(u.id)), str(fd, "code"));
  if (!okPassword || !okCode) return { error: "auth.errors.invalidCode" };
  await getDb().update(users).set({ totpEnabled: false, totpSecretEnc: null, recoveryCodes: null, updatedAt: new Date() }).where(eq(users.id, u.id));
  await audit(u.id, "mfa_disabled", await requestMeta());
  revalidatePath("/settings");
  return { ok: true };
}

export async function revokeSessionAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  if (/^[0-9a-f]{64}$/.test(id)) await getDb().delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, user.id)));
  revalidatePath("/settings");
}

export async function logoutOthersAction(): Promise<void> {
  const { user, session } = await requireUser();
  await deleteOtherSessions(user.id, session.id);
  await audit(user.id, "logout_all", await requestMeta());
  revalidatePath("/settings");
}

export async function setAiConsentAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const on = checkbox.parse(fd.get("ai"));
  await getDb().update(users).set({ aiConsent: on, consentAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  await audit(user.id, "consent_changed", { ...(await requestMeta()), aiConsent: on });
  revalidatePath("/", "layout");
}

/** DPDP Act right to erasure: removes the account, all profiles, results and files. */
export async function deleteAccountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  if (!(await hit("loginPerEmail", user.email)).ok) return { error: "common.rateLimited" };
  if (str(fd, "confirm").trim() !== "DELETE") return { fieldErrors: { confirm: "auth.errors.consent" } };
  const u = await loadUser(user.id);
  if (!u || !(await verifyPassword(u.passwordHash, str(fd, "password")))) return { fieldErrors: { password: "auth.errors.invalid" } };
  await deleteAllUserFiles(u.id);
  await deleteAllSessions(u.id);
  await getDb().delete(users).where(eq(users.id, u.id)); // cascades to every table
  await clearSessionCookie();
  (await cookies()).delete(PROFILE_COOKIE);
  redirect("/?deleted=1");
}
