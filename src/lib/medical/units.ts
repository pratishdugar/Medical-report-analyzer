/**
 * Parsing helpers for values, units and reference ranges as they appear on
 * Indian lab reports (e.g. "1,50,000", "2.5 lakhs/cumm", "13.0 - 17.0",
 * "< 200", "Upto 40", "18.2 L").
 */

export type ParsedValue = {
  num: number | null;
  text: string | null;
  /** "<" / ">" qualifiers such as "<0.5" */
  qualifier: "<" | ">" | null;
  flagHint: "H" | "L" | null;
};

const QUALITATIVE = /^(nil|negative|neg|positive|pos|absent|present|trace|not detected|detected|reactive|non[-\s]?reactive|normal|abnormal|clear|turbid|pale yellow|yellow|straw|occasional|few|plenty|\+{1,4}|\d\+)$/i;

/** Parse a number written with Indian/International digit grouping. */
export function parseNumber(raw: string): number | null {
  let s = raw.trim();
  // A single comma followed by 1-2 trailing digits is a decimal comma ("13,5").
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  s = s.replace(/,/g, "");
  if (!/^[+-]?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseValue(raw: string | number | null | undefined): ParsedValue {
  if (raw === null || raw === undefined) return { num: null, text: null, qualifier: null, flagHint: null };
  if (typeof raw === "number") return { num: Number.isFinite(raw) ? raw : null, text: null, qualifier: null, flagHint: null };
  let s = raw.trim();
  let flagHint: ParsedValue["flagHint"] = null;
  const flagMatch = s.match(/\s*[(\[]?\s*\b(H|L|HIGH|LOW|High|Low)\b\s*[)\]]?\s*\**$/);
  if (flagMatch && /\d/.test(s.slice(0, flagMatch.index))) {
    flagHint = flagMatch[1].toUpperCase().startsWith("H") ? "H" : "L";
    s = s.slice(0, flagMatch.index).trim();
  }
  const glued = s.match(/^([<>]?\s*[\d.,]+)\s*(H|L)$/i);
  if (glued) {
    flagHint = glued[2].toUpperCase() as "H" | "L";
    s = glued[1];
  }
  s = s.replace(/^\*+|\*+$/g, "").trim();
  let qualifier: ParsedValue["qualifier"] = null;
  const q = s.match(/^(<=?|>=?|≤|≥|less than|more than|greater than|upto|up to)\s*/i);
  if (q) {
    qualifier = /^(<|≤|less|up)/i.test(q[1]) ? "<" : ">";
    s = s.slice(q[0].length);
  }
  const num = parseNumber(s);
  if (num !== null) return { num, text: null, qualifier, flagHint };
  // "2-3" style semi-quantitative values (urine microscopy): keep text, use upper bound
  const span = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (span) return { num: Number(span[2]), text: s, qualifier: null, flagHint };
  const text = raw.trim().slice(0, 80);
  return { num: null, text: text || null, qualifier: null, flagHint };
}

export function isQualitativeText(text: string | null | undefined): boolean {
  return !!text && QUALITATIVE.test(text.trim());
}

const UNIT_ALIASES: Record<string, string> = {
  "/ul": "/ul", ul: "/ul", "cells/ul": "/ul", "no/ul": "/ul",
  "10^3/ul": "10^3/ul", "10^9/l": "10^3/ul", "thou/ul": "10^3/ul", "thousand/ul": "10^3/ul",
  "k/ul": "10^3/ul", "th/ul": "10^3/ul", "10^3cells/ul": "10^3/ul", "10^3/l": "10^3/ul",
  "lakh/ul": "lakh/ul", "lakhs/ul": "lakh/ul", "lac/ul": "lakh/ul", "lacs/ul": "lakh/ul",
  lakh: "lakh/ul", lakhs: "lakh/ul", "lakhcells/ul": "lakh/ul",
  "10^6/ul": "10^6/ul", "10^12/l": "10^6/ul", "million/ul": "10^6/ul", "millions/ul": "10^6/ul",
  "mill/ul": "10^6/ul", "m/ul": "10^6/ul", "millioncells/ul": "10^6/ul",
  "mg/dl": "mg/dl", "mg%": "mg/dl", "g/dl": "g/dl", "gm%": "g/dl", "g%": "g/dl", "g/l": "g/l",
  "mmol/l": "mmol/l", "umol/l": "umol/l", "nmol/l": "nmol/l", "pmol/l": "pmol/l", "mmol/mol": "mmol/mol",
  "ng/ml": "ng/ml", "ug/l": "ng/ml", "pg/ml": "pg/ml", "ng/l": "pg/ml", "ug/dl": "ug/dl", "ng/dl": "ng/dl",
  "mg/l": "mg/l", "uiu/ml": "uiu/ml", "miu/l": "uiu/ml", "uu/ml": "uiu/ml", "miu/ml": "miu/ml",
  "iu/ml": "iu/ml", "u/ml": "iu/ml", "iu/l": "u/l", "u/l": "u/l",
  "%": "%", percent: "%", fl: "fl", pg: "pg",
  "mm/hr": "mm/hr", "mm/1sthr": "mm/hr", "mm/1hr": "mm/hr", "mm/h": "mm/hr", "mm/hour": "mm/hr", "mm/1sthour": "mm/hr",
  mmhg: "mmhg", bpm: "bpm", "/min": "bpm", "beats/min": "bpm", kg: "kg", kgs: "kg", cm: "cm",
  "°f": "f", f: "f", degf: "f", "°c": "c", c: "c", degc: "c",
  "ml/min/1.73m2": "ml/min/1.73m2", "ml/min/1.73m^2": "ml/min/1.73m2", "ml/min": "ml/min/1.73m2",
  "mg/g": "mg/g", "mg/gcreatinine": "mg/g", "mg/gcreat": "mg/g", "/hpf": "/hpf", hpf: "/hpf",
  ratio: "ratio", "kg/m2": "kg/m2", "kg/m^2": "kg/m2",
};

/**
 * Normalise a unit string to a canonical token so conversion tables can be
 * keyed reliably ("µIU/mL" -> "uiu/ml", "Lakhs/cumm" -> "lakh/ul").
 */
export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u = raw.trim().toLowerCase();
  if (!u) return null;
  u = u
    .replace(/[µμ]/g, "u")
    .replace(/mcg/g, "ug")
    .replace(/\s+/g, "")
    .replace(/[×*]/g, "x")
    .replace(/³/g, "^3")
    .replace(/⁶/g, "^6")
    .replace(/⁹/g, "^9")
    .replace(/¹²/g, "^12")
    .replace(/²/g, "2")
    .replace(/gms?\//g, "g/")
    .replace(/litre|liter/g, "l")
    .replace(/cu\.?mm|mm\^?3|c\.?mm/g, "ul")
    .replace(/meq\/l/g, "mmol/l")
    .replace(/^x(?=10)/, "")
    .replace(/^10e(\d+)/, "10^$1");
  return UNIT_ALIASES[u] ?? u;
}

export type ParsedRange = { low: number | null; high: number | null; text: string | null };

/** Parse reference range text such as "13.0 - 17.0", "< 200", "Upto 40", ">= 40". */
export function parseRange(raw: string | null | undefined): ParsedRange {
  if (!raw) return { low: null, high: null, text: null };
  const text = raw.trim().slice(0, 120);
  const s = text.replace(/,(?=\d{2,3}\b)/g, "");
  const between = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  if (between) {
    const low = Number(between[1]);
    const high = Number(between[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && high >= low) return { low, high, text };
  }
  const upper = s.match(/(?:<=?|≤|less than|below|upto|up to|till)\s*(\d+(?:\.\d+)?)/i);
  if (upper) return { low: null, high: Number(upper[1]), text };
  const lower = s.match(/(?:>=?|≥|more than|greater than|above|min\.?)\s*(\d+(?:\.\d+)?)/i);
  if (lower) return { low: Number(lower[1]), high: null, text };
  return { low: null, high: null, text };
}

/** All numbers in a text with grouping separators removed, for verification. */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  const cleaned = text.replace(/(\d),(?=\d)/g, "$1");
  for (const m of cleaned.matchAll(/\d+(?:\.\d+)?/g)) {
    out.add(canonicalNumber(m[0]));
  }
  return out;
}

export function canonicalNumber(s: string): string {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? String(n) : s;
}

/** Day-first date parsing (DD/MM/YYYY is standard on Indian reports). */
export function parseReportDate(raw: string | null | undefined, now = new Date()): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  let y: number | undefined, m: number | undefined, d: number | undefined;
  let match = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/\b(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/., ]+(\d{2,4})\b/))) {
    d = Number(match[1]);
    m = months[match[2].toLowerCase().slice(0, match[2].toLowerCase().startsWith("sept") ? 4 : 3)];
    y = Number(match[3]);
  } else if ((match = s.match(/\b([A-Za-z]{3,9})[ -](\d{1,2}),?[ -](\d{4})\b/))) {
    m = months[match[1].toLowerCase().slice(0, 3)];
    d = Number(match[2]);
    y = Number(match[3]);
  } else if ((match = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (m > 12 && d <= 12) [d, m] = [m, d];
  }
  if (!y || !m || !d) return null;
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1950) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  if (date.getTime() > now.getTime() + 2 * 86400000) return null;
  return date.toISOString().slice(0, 10);
}
