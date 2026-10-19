"use client";

import { useActionState, useEffect, useRef } from "react";
import { logVitalsAction } from "@/actions/vitals";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Card, CardTitle, Field, Input, Select } from "./ui";

function Num({ name, label, unit, step = "1" }: { name: string; label: string; unit: string; step?: string }) {
  return (
    <Field label={`${label} (${unit})`} htmlFor={name}>
      <Input id={name} name={name} type="number" inputMode="decimal" step={step} />
    </Field>
  );
}

export function VitalsForm({ profileId }: { profileId: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(logVitalsAction, {} as ActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <Field label={t("vitals.date")} htmlFor="date">
        <Input id="date" name="date" type="date" defaultValue={today} max={today} className="max-w-xs" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-surface-2 shadow-none">
          <CardTitle>{t("vitals.bp")}</CardTitle>
          <div className="grid grid-cols-3 gap-3">
            <Num name="systolic" label={t("vitals.systolic")} unit="mmHg" />
            <Num name="diastolic" label={t("vitals.diastolic")} unit="mmHg" />
            <Num name="pulse" label={t("vitals.pulse")} unit="bpm" />
          </div>
        </Card>
        <Card className="bg-surface-2 shadow-none">
          <CardTitle>{t("vitals.sugar")}</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Num name="sugar" label={t("common.value")} unit="mg/dL" />
            <Field label={t("vitals.sugarType")} htmlFor="sugarType">
              <Select id="sugarType" name="sugarType" defaultValue="fasting">
                <option value="fasting">{t("vitals.fasting")}</option>
                <option value="pp">{t("vitals.pp")}</option>
                <option value="random">{t("vitals.random")}</option>
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="bg-surface-2 shadow-none md:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Num name="weight" label={t("vitals.weight")} unit="kg" step="0.1" />
            <Num name="waist" label={t("vitals.waist")} unit="cm" step="0.5" />
            <Num name="spo2" label={t("vitals.spo2")} unit="%" />
            <Num name="temp" label={t("vitals.temp")} unit="°F" step="0.1" />
          </div>
        </Card>
      </div>
      <SubmitButton>{t("common.save")}</SubmitButton>
    </form>
  );
}
