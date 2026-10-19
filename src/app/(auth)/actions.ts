"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { burnPasswordCheck, checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { hit } from "@/lib/auth/rate-limit";
import {
  clearSessionCookie,
  createSession,
  deleteAllSessions,
  deleteSession,
  readSessionToken,
  setSessionCookie,
  upgradeMfaSession,
  validateSessionToken,
} from "@/lib/auth/session";
import { hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { aad, decryptText, randomToken, sha256Hex } from "@/lib/crypto";
import { getDb, withUser } from "@/lib/db";
import { passwordResetTokens, profiles, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { requestMeta } from "@/lib/request";
import { checkbox, emailSchema, safeNext, str, type ActionState } from "@/lib/validation";

const CONSENT_VERSION = "2026-10-v1";
const LOCK_AFTER = 10;
const LOCK_MINUTES = 15;

const findUserByEmail = async (email: string) =>
  (await getDb().select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1))[0];

export async function signupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!env().ALLOW_SIGNUPS) return { error: "auth.errors.signupsClosed" };
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(100),
      email: emailSchema,
      password: z.string().max(200),
      terms: checkbox,
      age: checkbox,
      health: checkbox,
      ai: checkbox,
    })
    .safeParse({
      name: str(fd, "name"),
      email: str(fd, "email"),
      password: str(fd, "password"),
      terms: fd.get("terms"),
      age: fd.get("age"),
      health: fd.get("health"),
      ai: fd.get("ai"),
    });
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    return {
      fieldErrors: {
        ...(fields.has("name") ? { name: "auth.errors.nameRequired" } : {}),
        ...(fields.has("email") ? { email: "auth.errors.emailInvalid" } : {}),
      },
    };
  }
  const { name, email, password, terms, age, health, ai } = parsed.data;
  if (!terms || !age || !health) return { error: "auth.errors.consent" };
  const problem = checkPasswordStrength(password, email);
  if (problem) return { fieldErrors: { password: `auth.errors.${problem}` } };

  const meta = await requestMeta();
  if (!(await hit("signupPerIp", meta.ip)).ok) return { error: "common.rateLimited" };

  if (await findUserByEmail(email)) {
    await burnPasswordCheck(password);
    return { error: "auth.errors.emailTaken" };
  }
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  let userId: string;
  try {
    const [user] = await getDb()
      .insert(users)
      .values({
        email,
        name,
        passwordHash: await hashPassword(password),
        locale,
        aiConsent: ai,
        consentVersion: CONSENT_VERSION,
        consentAt: new Date(),
      })
      .returning({ id: users.id });
    userId = user.id;
  } catch {
    return { error: "auth.errors.emailTaken" };
  }
  await withUser(userId, (tx) => tx.insert(profiles).values({ userId, name, relation: "self", isPrimary: true }));
  await audit(userId, "signup", { ...meta, consentVersion: CONSENT_VERSION, aiConsent: ai });
  const { token } = await createSession(userId, { remember: false, mfaPending: false, ...meta });
  await setSessionCookie(token, false);
  redirect("/family?first=1");
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const emailParsed = emailSchema.safeParse(str(fd, "email"));
  const password = str(fd, "password").slice(0, 200);
  const remember = checkbox.parse(fd.get("remember"));
  const next = safeNext(str(fd, "next"));
  if (!emailParsed.success || !password) return { error: "auth.errors.invalid" };
  const email = emailParsed.data;
  const meta = await requestMeta();

  const [ipLimit, emailLimit] = await Promise.all([hit("loginPerIp", meta.ip), hit("loginPerEmail", email)]);
  if (!ipLimit.ok || !emailLimit.ok) return { error: "common.rateLimited" };

  const user = await findUserByEmail(email);
  if (!user) {
    await burnPasswordCheck(password);
    return { error: "auth.errors.invalid" };
  }
  const valid = await verifyPassword(user.passwordHash, password);
  const locked = user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  if (!valid) {
    const failures = user.failedLoginCount + 1;
    await getDb()
      .update(users)
      .set(
        failures >= LOCK_AFTER
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: failures },
      )
      .where(eq(users.id, user.id));
    await audit(user.id, "login_failed", meta);
    return { error: "auth.errors.invalid" };
  }
  if (locked) return { error: "auth.errors.locked" };

  await getDb().update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
  const { token } = await createSession(user.id, { remember, mfaPending: user.totpEnabled, ...meta });
  await setSessionCookie(token, remember);
  (await cookies()).set(LOCALE_COOKIE, normalizeLocale(user.locale), { path: "/", maxAge: 31536000, sameSite: "lax" });
  if (user.totpEnabled) redirect(`/login/verify?next=${encodeURIComponent(next)}`);
  await audit(user.id, "login", meta);
  redirect(next);
}

export async function verifyMfaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = await readSessionToken();
  const current = token ? await validateSessionToken(token) : null;
  if (!current) redirect("/login");
  if (!current.session.mfaPending) redirect("/dashboard");
  const meta = await requestMeta();
  if (!(await hit("mfaPerSession", current.session.id)).ok) return { error: "common.rateLimited" };

  const code = str(fd, "code").trim().slice(0, 20);
  const [user] = await getDb().select().from(users).where(eq(users.id, current.user.id)).limit(1);
  let ok = false;
  if (user?.totpSecretEnc && /^\d{6}$/.test(code.replace(/\s/g, ""))) {
    ok = verifyTotp(decryptText(user.id, user.totpSecretEnc, aad.userTotp(user.id)), code);
  } else if (user?.recoveryCodes?.length) {
    const h = hashRecoveryCode(code);
    if (user.recoveryCodes.includes(h)) {
      ok = true;
      await getDb()
        .update(users)
        .set({ recoveryCodes: user.recoveryCodes.filter((c) => c !== h) })
        .where(eq(users.id, user.id));
    }
  }
  if (!ok) {
    await audit(current.user.id, "mfa_failed", meta);
    return { error: "auth.errors.invalidCode" };
  }
  const upgraded = await upgradeMfaSession(current.session, current.session.remember);
  await setSessionCookie(upgraded.token, current.session.remember);
  await audit(current.user.id, "login", { ...meta, mfa: true });
  redirect(safeNext(str(fd, "next")));
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    const current = await validateSessionToken(token);
    await deleteSession(sha256Hex(token));
    if (current) await audit(current.user.id, "logout", await requestMeta());
  }
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(str(fd, "email"));
  if (!parsed.success) return { fieldErrors: { email: "auth.errors.emailInvalid" } };
  const email = parsed.data;
  const meta = await requestMeta();
  const [ipLimit, emailLimit] = await Promise.all([hit("resetPerIp", meta.ip), hit("resetPerEmail", email)]);
  // Same response either way so the form can't be used to discover accounts.
  const done: ActionState = { ok: true, message: "auth.forgotSent" };
  if (!ipLimit.ok || !emailLimit.ok) return done;
  const user = await findUserByEmail(email);
  if (!user) return done;
  const token = randomToken(32);
  await getDb().insert(passwordResetTokens).values({
    id: sha256Hex(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });
  const link = `${env().APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(
    user.email,
    `${env().APP_NAME}: reset your password`,
    `Namaste ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.\n\n— ${env().APP_NAME}`,
  ).catch((e) => console.error("[email] send failed", (e as Error).message));
  return done;
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const password = str(fd, "password").slice(0, 200);
  if (!token || token.length > 100) return { error: "auth.errors.invalidToken" };
  const meta = await requestMeta();
  if (!(await hit("resetPerIp", meta.ip)).ok) return { error: "common.rateLimited" };
  const id = sha256Hex(token);
  const [row] = await getDb()
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  if (!row) return { error: "auth.errors.invalidToken" };
  const [user] = await getDb().select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) return { error: "auth.errors.invalidToken" };
  const problem = checkPasswordStrength(password, user.email);
  if (problem) return { fieldErrors: { password: `auth.errors.${problem}` } };

  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await getDb().delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  await deleteAllSessions(user.id);
  await audit(user.id, "password_reset", meta);
  redirect("/login?reset=1");
}

export async function setLocaleAction(fd: FormData): Promise<void> {
  const locale = normalizeLocale(str(fd, "locale"));
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  const token = await readSessionToken();
  const current = token ? await validateSessionToken(token) : null;
  if (current && !current.session.mfaPending) {
    await getDb().update(users).set({ locale }).where(eq(users.id, current.user.id));
  }
  redirect(safeNext(str(fd, "back"), "/"));
}
