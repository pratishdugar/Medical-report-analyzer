"use client";

import { useActionState } from "react";
import { saveProfileAction } from "@/actions/profile";
import type { ActionState } from "@/lib/validation";
import { FormMessage, SubmitButton } from "./forms";
import { useI18n } from "./i18n-provider";
import { Field, Input, Select } from "./ui";

const RELATIONS = ["self", "spouse", "father", "mother", "son", "daughter", "grandparent", "sibling", "other"];
const SEXES = ["male", "female", "other"];
const DIETS = ["vegetarian", "eggetarian", "non_vegetarian", "vegan", "jain"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export type ProfileFormValues = {
  id?: string;
  name: string;
  relation: string;
  dateOfBirth: string | null;
  sex: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  diet: string | null;
  hasAbha?: boolean;
};

export function ProfileForm({ profile, first, submitLabel }: { profile?: ProfileFormValues; first?: boolean; submitLabel?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveProfileAction, {} as ActionState);
  const fe = state.fieldErrors ?? {};
  const key = profile?.id ?? "new";
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {profile?.id && <input type="hidden" name="id" value={profile.id} />}
      {first && <input type="hidden" name="first" value="1" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("family.fields.name")} htmlFor={`name-${key}`} error={fe.name && t(fe.name)}>
          <Input id={`name-${key}`} name="name" defaultValue={profile?.name ?? ""} required maxLength={100} />
        </Field>
        <Field label={t("family.fields.relation")} htmlFor={`relation-${key}`}>
          <Select id={`relation-${key}`} name="relation" defaultValue={profile?.relation ?? "other"}>
            {RELATIONS.map((r) => <option key={r} value={r}>{t(`family.relations.${r}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("family.fields.dob")} htmlFor={`dob-${key}`} error={fe.dateOfBirth && t(fe.dateOfBirth)}>
          <Input id={`dob-${key}`} name="dateOfBirth" type="date" defaultValue={profile?.dateOfBirth ?? ""} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" />
        </Field>
        <Field label={t("family.fields.sex")} htmlFor={`sex-${key}`}>
          <Select id={`sex-${key}`} name="sex" defaultValue={profile?.sex ?? ""}>
            <option value="">—</option>
            {SEXES.map((s) => <option key={s} value={s}>{t(`family.sexes.${s}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("family.fields.height")} htmlFor={`height-${key}`} optional={t("common.optional")}>
          <Input id={`height-${key}`} name="heightCm" type="number" inputMode="decimal" min={40} max={250} step="0.1" defaultValue={profile?.heightCm ?? ""} />
        </Field>
        <Field label={t("family.fields.diet")} htmlFor={`diet-${key}`} optional={t("common.optional")}>
          <Select id={`diet-${key}`} name="diet" defaultValue={profile?.diet ?? ""}>
            <option value="">—</option>
            {DIETS.map((d) => <option key={d} value={d}>{t(`family.diets.${d}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("family.fields.bloodGroup")} htmlFor={`blood-${key}`} optional={t("common.optional")}>
          <Select id={`blood-${key}`} name="bloodGroup" defaultValue={profile?.bloodGroup ?? ""}>
            <option value="">—</option>
            {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label={t("family.fields.abha")} htmlFor={`abha-${key}`} hint={t("family.fields.abhaHint")} error={fe.abha && t(fe.abha)} optional={t("common.optional")}>
          <Input id={`abha-${key}`} name="abha" inputMode="numeric" autoComplete="off" placeholder={profile?.hasAbha ? "•••• •••• •••• ••" : "12-3456-7890-1234"} maxLength={20} />
        </Field>
      </div>
      <SubmitButton>{submitLabel ?? t("common.save")}</SubmitButton>
    </form>
  );
}
