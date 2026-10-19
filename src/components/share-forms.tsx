"use client";

import { useActionState, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { createShareAction, verifySharePinAction } from "@/actions/share";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Alert, Button, Checkbox, Field, Input, Select } from "./ui";

export function CreateShareForm({ profileId }: { profileId: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(createShareAction, {} as ActionState);
  const [copied, setCopied] = useState(false);
  const created = state.ok ? (state.data as { url: string; pin: string | null; expiresAt: string }) : null;
  const expiry = created ? new Date(created.expiresAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";
  return (
    <div className="space-y-4">
      {created && (
        <Alert tone="ok" title={t("share.createdTitle")}>
          <p className="mb-2">{t("share.createdBody")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded bg-surface px-2 py-1 text-xs">{created.url}</code>
            <Button type="button" variant="secondary" className="min-h-0 px-3 py-1.5" onClick={() => navigator.clipboard.writeText(created.url).then(() => setCopied(true))}>
              <Copy size={14} aria-hidden /> {copied ? t("common.copied") : t("common.copy")}
            </Button>
            <a
              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-medium text-black"
              href={`https://wa.me/?text=${encodeURIComponent(t("share.whatsappText", { date: expiry, url: created.url }))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={14} aria-hidden /> {t("share.whatsapp")}
            </a>
          </div>
          {created.pin && <p className="mt-2 text-base">{t("share.pinIs")}: <b className="tracking-[0.3em]">{created.pin}</b></p>}
        </Alert>
      )}
      <form action={action} className="space-y-3">
        {state.error && <FormMessage state={state} />}
        <input type="hidden" name="profileId" value={profileId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("share.label")} htmlFor="label" optional={t("common.optional")}>
            <Input id="label" name="label" maxLength={60} placeholder={t("share.labelHint")} />
          </Field>
          <Field label={t("share.expiry")} htmlFor="days">
            <Select id="days" name="days" defaultValue="7">
              {["1", "7", "30"].map((d) => <option key={d} value={d}>{t(`share.expiries.${d}`)}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox name="pin" defaultChecked label={<>{t("share.pin")}<span className="block text-xs text-muted">{t("share.pinHint")}</span></>} />
        <Checkbox name="files" label={t("share.files")} />
        <p className="text-xs text-muted">{t("share.warning")}</p>
        <SubmitButton>{t("share.create")}</SubmitButton>
      </form>
    </div>
  );
}

export function SharePinForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(verifySharePinAction, {} as ActionState);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label={t("shared.enterPin")} htmlFor="pin">
        <Input id="pin" name="pin" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus className="text-center text-2xl tracking-[0.5em]" />
      </Field>
      <SubmitButton className="w-full">{t("shared.open")}</SubmitButton>
    </form>
  );
}
