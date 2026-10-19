import type { Sex } from "./biomarkers";

/** CKD-EPI 2021 (race-free) estimated GFR from serum creatinine in mg/dL. */
export function egfrCkdEpi2021(creatinineMgDl: number, age: number, sex: Sex): number | null {
  if (!(creatinineMgDl > 0) || !(age >= 18)) return null;
  const female = sex === "female";
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const ratio = creatinineMgDl / k;
  const value = 142 * Math.min(ratio, 1) ** a * Math.max(ratio, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
  return Math.round(value);
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 50)) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
