"use client";

import { useActionState } from "react";
import { saveObservationAction } from "@/actions/reports";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Field, Input } from "./ui";

export function AddReadingForm({ profileId, code, unit }: { profileId: string; code: string; unit: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveObservationAction, {} as ActionState);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="unit" value={unit} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("vitals.date")} htmlFor="observedAt">
          <Input id="observedAt" name="observedAt" type="date" defaultValue={today} max={today} required />
        </Field>
        <Field label={`${t("common.value")}${unit ? ` (${unit})` : ""}`} htmlFor="value">
          <Input id="value" name="value" inputMode="decimal" required maxLength={20} />
        </Field>
      </div>
      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
    </form>
  );
}
