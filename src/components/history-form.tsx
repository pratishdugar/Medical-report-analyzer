"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveHistoryAction } from "@/actions/history";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Checkbox, Field, Input, Select, Textarea } from "./ui";

const TYPES = ["condition", "medication", "allergy", "surgery", "vaccination", "family_history", "other"];

export function HistoryForm({ profileId }: { profileId: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveHistoryAction, {} as ActionState);
  const [type, setType] = useState("condition");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("history.type")} htmlFor="type">
          <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((x) => <option key={x} value={x}>{t(`history.types.${x}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("history.entryTitle")} htmlFor="title">
          <Input id="title" name="title" required maxLength={200} placeholder={t(`history.placeholders.${type}`)} />
        </Field>
        <Field label={t("history.start")} htmlFor="startDate" optional={t("common.optional")}>
          <Input id="startDate" name="startDate" type="date" max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label={t("history.end")} htmlFor="endDate" optional={t("common.optional")}>
          <Input id="endDate" name="endDate" type="date" />
        </Field>
      </div>
      <Field label={t("history.details")} htmlFor="details" optional={t("common.optional")}>
        <Textarea id="details" name="details" maxLength={2000} />
      </Field>
      <Checkbox name="active" defaultChecked label={t("history.active")} />
      <SubmitButton>{t("history.add")}</SubmitButton>
    </form>
  );
}
