import { getBiomarker } from "./medical/biomarkers";
import { dateLocale, type Locale } from "./i18n";

export function biomarkerName(code: string | null, raw: string, locale: Locale): string {
  const b = getBiomarker(code);
  if (!b) return raw;
  return locale === "hi" ? b.hi : b.name;
}

export function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

export function fmtValue(o: { valueNum: number | null; valueText: string | null; biomarkerCode?: string | null; code?: string | null }): string {
  if (o.valueNum === null) return o.valueText ?? "—";
  const b = getBiomarker(o.biomarkerCode ?? o.code ?? null);
  return fmtNum(o.valueNum, b ? b.decimals + (b.decimals === 0 && o.valueNum < 10 ? 1 : 0) : 2);
}

export function fmtRange(low: number | null, high: number | null, text?: string | null): string {
  if (low !== null && high !== null) return `${fmtNum(low)} – ${fmtNum(high)}`;
  if (high !== null) return `< ${fmtNum(high)}`;
  if (low !== null) return `> ${fmtNum(low)}`;
  return text ?? "—";
}

export function fmtDate(iso: string | Date | null | undefined, locale: Locale, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", ...opts });
}

export function fmtDateTime(d: Date, locale: Locale): string {
  return d.toLocaleString(dateLocale(locale), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
