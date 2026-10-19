"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
  verifyMfaAction,
} from "@/app/(auth)/actions";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Checkbox, Field, Input } from "./ui";

const initial: ActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("auth.email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={t("auth.password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Checkbox name="remember" label={<>{t("auth.remember")}<span className="block text-xs text-muted">{t("auth.rememberHint")}</span></>} />
      <SubmitButton className="w-full" pendingLabel={t("common.loading")}>{t("auth.loginCta")}</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">{t("auth.forgot")}</Link>
        <span>
          {t("auth.noAccount")} <Link href="/signup" className="text-primary hover:underline">{t("auth.signupCta")}</Link>
        </span>
      </div>
    </form>
  );
}

export function SignupForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(signupAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label={t("auth.name")} htmlFor="name" error={fe.name && t(fe.name)}>
        <Input id="name" name="name" autoComplete="name" required maxLength={100} />
      </Field>
      <Field label={t("auth.email")} htmlFor="email" error={fe.email && t(fe.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={t("auth.password")} htmlFor="password" hint={t("auth.passwordHint")} error={fe.password && t(fe.password)}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <div className="space-y-3 rounded-lg bg-surface-2 p-3">
        <Checkbox
          name="terms"
          required
          label={
            <>
              {t("auth.consentTerms")}{" "}
              <Link href="/terms" target="_blank" className="text-primary underline">{t("landing.termsLink")}</Link> ·{" "}
              <Link href="/privacy" target="_blank" className="text-primary underline">{t("landing.privacyLink")}</Link>
            </>
          }
        />
        <Checkbox name="age" required label={t("auth.consentAge")} />
        <Checkbox name="health" required label={t("auth.consentHealth")} />
        <Checkbox name="ai" label={t("auth.consentAi")} />
      </div>
      <SubmitButton className="w-full" pendingLabel={t("common.loading")}>{t("auth.signupCta")}</SubmitButton>
      <p className="text-center text-sm">
        {t("auth.haveAccount")} <Link href="/login" className="text-primary hover:underline">{t("auth.loginCta")}</Link>
      </p>
    </form>
  );
}

export function VerifyForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(verifyMfaAction, initial);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("auth.code")} htmlFor="code">
        <Input id="code" name="code" autoComplete="one-time-code" inputMode="text" required autoFocus maxLength={20} className="tracking-widest text-lg" />
      </Field>
      <SubmitButton className="w-full" pendingLabel={t("common.loading")}>{t("auth.verifyCta")}</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {!state.ok && (
        <>
          <Field label={t("auth.email")} htmlFor="email" error={state.fieldErrors?.email && t(state.fieldErrors.email)}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full" pendingLabel={t("common.loading")}>{t("auth.forgotCta")}</SubmitButton>
        </>
      )}
      <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">{t("auth.backToLogin")}</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label={t("auth.newPassword")} htmlFor="password" hint={t("auth.passwordHint")} error={state.fieldErrors?.password && t(state.fieldErrors.password)}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <SubmitButton className="w-full">{t("auth.resetCta")}</SubmitButton>
    </form>
  );
}
