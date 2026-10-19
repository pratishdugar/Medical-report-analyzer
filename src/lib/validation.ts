import { z } from "zod";

export type ActionState = {
  ok?: boolean;
  /** i18n key of a form-level error */
  error?: string;
  /** field -> i18n key */
  fieldErrors?: Record<string, string>;
  /** i18n key of a success message */
  message?: string;
  data?: Record<string, unknown>;
};

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

export const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "invalid date");

export const optionalIsoDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(isoDate.nullable());

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal(""), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true" || v === "1");

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Only allow same-site relative redirects ("/dashboard"), never "//evil.com" or "https://…". */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) {
    return fallback;
  }
  return next.slice(0, 300);
}

export const RELATIONS = ["self", "spouse", "father", "mother", "son", "daughter", "grandparent", "sibling", "other"] as const;
export const SEXES = ["male", "female", "other"] as const;
export const DIETS = ["vegetarian", "eggetarian", "non_vegetarian", "vegan", "jain"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const HISTORY_TYPES = ["condition", "medication", "allergy", "surgery", "vaccination", "family_history", "other"] as const;
export const REPORT_CATEGORIES = ["auto", "lab", "prescription", "discharge", "imaging", "other"] as const;
