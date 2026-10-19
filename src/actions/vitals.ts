"use server";

import { revalidatePath } from "next/cache";
import { getOwnedProfile, requireUser } from "@/lib/dal";
import { withUser } from "@/lib/db";
import { observations } from "@/lib/db/schema";
import type { Sex } from "@/lib/medical/biomarkers";
import { ageOn, normalizeTest } from "@/lib/medical/normalize";
import { optionalIsoDate, str, type ActionState } from "@/lib/validation";

// Plausible input bounds — reject typos like 1200 mmHg before they pollute charts.
const FIELDS: { field: string; code: string; unit: string; min: number; max: number }[] = [
  { field: "systolic", code: "BP_SYS", unit: "mmHg", min: 50, max: 300 },
  { field: "diastolic", code: "BP_DIA", unit: "mmHg", min: 30, max: 200 },
  { field: "pulse", code: "PULSE", unit: "bpm", min: 20, max: 250 },
  { field: "weight", code: "WEIGHT", unit: "kg", min: 1, max: 400 },
  { field: "waist", code: "WAIST", unit: "cm", min: 30, max: 250 },
  { field: "spo2", code: "SPO2", unit: "%", min: 50, max: 100 },
  { field: "temp", code: "TEMP", unit: "°F", min: 90, max: 110 },
];
const SUGAR_CODES: Record<string, string> = { fasting: "GLU_F", pp: "GLU_PP", random: "GLU_R" };

export async function logVitalsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const profile = await getOwnedProfile(user.id, str(fd, "profileId"));
  if (!profile) return { error: "common.notFound" };
  const date = optionalIsoDate.catch(null).parse(str(fd, "date")) ?? new Date().toISOString().slice(0, 10);
  if (date > new Date().toISOString().slice(0, 10)) return { error: "vitals.outOfRange" };

  const entries: { code: string; value: number; unit: string }[] = [];
  for (const f of FIELDS) {
    const raw = str(fd, f.field).trim();
    if (!raw) continue;
    let v = Number(raw.replace(",", "."));
    if (f.code === "TEMP" && v >= 32 && v <= 43) v = (v * 9) / 5 + 32; // entered in °C
    if (!Number.isFinite(v) || v < f.min || v > f.max) return { error: "vitals.outOfRange" };
    entries.push({ code: f.code, value: Math.round(v * 10) / 10, unit: f.unit });
  }
  const sugar = str(fd, "sugar").trim();
  if (sugar) {
    const v = Number(sugar);
    if (!Number.isFinite(v) || v < 20 || v > 700) return { error: "vitals.outOfRange" };
    entries.push({ code: SUGAR_CODES[str(fd, "sugarType")] ?? "GLU_R", value: v, unit: "mg/dL" });
  }
  if (!entries.length) return { error: "vitals.nothing" };

  const ctx = { sex: (profile.sex === "male" || profile.sex === "female" ? profile.sex : null) as Sex | null, age: ageOn(profile.dateOfBirth, date) };
  const rows = entries.flatMap((e) => {
    const n = normalizeTest({ name: e.code, value: String(e.value), unit: e.unit, code: e.code }, ctx);
    return n
      ? [{
          userId: user.id,
          profileId: profile.id,
          reportId: null,
          biomarkerCode: n.code,
          name: n.name,
          valueNum: n.valueNum,
          valueText: n.valueText,
          unit: n.unit,
          refLow: n.refLow,
          refHigh: n.refHigh,
          flag: n.flag,
          observedAt: date,
          source: "manual",
          verified: true,
          userEdited: true,
        }]
      : [];
  });
  await withUser(user.id, (tx) => tx.insert(observations).values(rows));
  revalidatePath("/", "layout");
  return { ok: true, message: "vitals.saved", data: { count: rows.length } };
}
