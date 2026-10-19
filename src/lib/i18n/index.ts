import type { L } from "../medical/biomarkers";
import { en, type Messages } from "./en";
import { hi } from "./hi";

export type Locale = "en" | "hi";
export const LOCALES: Locale[] = ["en", "hi"];
export const LOCALE_COOKIE = "lang";
export const dictionaries: Record<Locale, Messages> = { en, hi };

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

function lookup(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), messages);
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translate(messages: Messages, key: string, vars?: Record<string, string | number>): string {
  const v = lookup(messages, key);
  const fallback = lookup(en, key);
  const str = typeof v === "string" ? v : typeof fallback === "string" ? fallback : key;
  return interpolate(str, vars);
}

export function makeT(messages: Messages): TFunction {
  return (key, vars) => translate(messages, key, vars);
}

/** Pick the right language from a bilingual content object. */
export function pick(l: L | undefined | null, locale: Locale): string {
  if (!l) return "";
  return l[locale] || l.en;
}

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "hi" ? "hi" : "en";
}

export function dateLocale(locale: Locale) {
  return locale === "hi" ? "hi-IN" : "en-IN";
}
