"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  confirmTotpAction,
  deleteAccountAction,
  disableTotpAction,
  startTotpAction,
  updateAccountAction,
} from "@/actions/settings";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Alert, Field, Input, Select } from "./ui";

const init = {} as ActionState;

export function AccountForm({ name, email, locale }: { name: string; email: string; locale: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateAccountAction, init);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label={t("auth.name")} htmlFor="acc-name" error={state.fieldErrors?.name && t(state.fieldErrors.name)}>
        <Input id="acc-name" name="name" defaultValue={name} required maxLength={100} />
      </Field>
      <Field label={t("auth.email")} htmlFor="acc-email"><Input id="acc-email" value={email} disabled readOnly /></Field>
      <Field label={t("settings.language")} htmlFor="acc-locale">
        <Select id="acc-locale" name="locale" defaultValue={locale}>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </Select>
      </Field>
      <SubmitButton variant="secondary">{t("settings.saveAccount")}</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(changePasswordAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label={t("auth.currentPassword")} htmlFor="pw-current" error={fe.current && t(fe.current)}>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={t("auth.newPassword")} htmlFor="pw-new" hint={t("auth.passwordHint")} error={fe.password && t(fe.password)}>
        <Input id="pw-new" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <SubmitButton variant="secondary">{t("settings.changePassword")}</SubmitButton>
    </form>
  );
}

export function MfaSetup() {
  const { t } = useI18n();
  const [start, startAction] = useActionState(startTotpAction, init);
  const [confirm, confirmAction] = useActionState(confirmTotpAction, init);
  if (confirm.ok) {
    const codes = (confirm.data?.codes as string[]) ?? [];
    return (
      <Alert tone="ok" title={t("settings.mfaOn")}>
        <p className="mb-2">{t("settings.mfaRecovery")}</p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      </Alert>
    );
  }
  if (!start.ok) {
    return (
      <form action={startAction} className="space-y-2">
        <p className="text-sm text-muted">{t("settings.mfaOff")}</p>
        <FormMessage state={start} />
        <SubmitButton variant="secondary">{t("settings.mfaEnable")}</SubmitButton>
      </form>
    );
  }
  const { qr, secret } = start.data as { qr: string; secret: string };
  return (
    <form action={confirmAction} className="space-y-3">
      <p className="text-sm">{t("settings.mfaScan")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="2FA QR code" width={180} height={180} className="rounded-lg border border-border bg-white p-2" />
      <p className="text-xs text-muted">{t("settings.mfaKey")}: <code className="break-all">{secret}</code></p>
      <FormMessage state={confirm} />
      <Field label={t("auth.code")} htmlFor="mfa-code">
        <Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="max-w-[10rem] tracking-widest" />
      </Field>
      <SubmitButton>{t("settings.mfaConfirm")}</SubmitButton>
    </form>
  );
}

export function MfaDisable() {
  const { t } = useI18n();
  const [state, action] = useActionState(disableTotpAction, init);
  if (state.ok) return <Alert tone="ok">{t("settings.mfaOff")}</Alert>;
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary">{t("settings.mfaDisable")}</summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-sm text-muted">{t("settings.mfaDisableHint")}</p>
        <FormMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("auth.password")} htmlFor="dis-pw"><Input id="dis-pw" name="password" type="password" autoComplete="current-password" required /></Field>
          <Field label={t("auth.code")} htmlFor="dis-code"><Input id="dis-code" name="code" inputMode="numeric" autoComplete="one-time-code" required /></Field>
        </div>
        <SubmitButton variant="danger">{t("settings.mfaDisable")}</SubmitButton>
      </form>
    </details>
  );
}

export function DeleteAccountForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(deleteAccountAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-bad">{t("settings.deleteAccount")}</summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-sm text-muted">{t("settings.deleteBody")}</p>
        <FormMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("auth.password")} htmlFor="del-pw" error={fe.password && t(fe.password)}><Input id="del-pw" name="password" type="password" autoComplete="current-password" required /></Field>
          <Field label={t("settings.deleteConfirmLabel")} htmlFor="del-confirm" error={fe.confirm && t(fe.confirm)}><Input id="del-confirm" name="confirm" required autoComplete="off" /></Field>
        </div>
        <SubmitButton variant="danger">{t("settings.deleteCta")}</SubmitButton>
      </form>
    </details>
  );
}
