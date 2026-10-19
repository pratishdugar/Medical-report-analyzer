import { BIOMARKER_LIST, getBiomarker, type Biomarker, type Sex } from "./biomarkers";
import { isQualitativeText, normalizeUnit, parseRange, parseValue } from "./units";

export type Flag = "low" | "normal" | "high" | "critical_low" | "critical_high" | "abnormal" | "unknown";

/** Lower-case, strip punctuation and common decorations ("S.", "Serum", methods). */
export function normalizeTestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(serum|plasma|sr|s)\s+/, "")
    .replace(/\s+(serum|plasma|level|levels|value)$/, "")
    .trim();
}

type AliasEntry = { alias: string; code: string; short: boolean };

const ALIASES: AliasEntry[] = BIOMARKER_LIST.flatMap((b) =>
  [b.name, b.code, ...b.aliases].map((a) => {
    const alias = normalizeTestName(a);
    return { alias, code: b.code, short: alias.length <= 3 };
  }),
)
  .filter((e) => e.alias.length > 0)
  // longest first, so "hdl cholesterol" beats "cholesterol"
  .sort((a, b) => b.alias.length - a.alias.length);

const EXACT = new Map<string, string>();
for (const e of [...ALIASES].reverse()) EXACT.set(e.alias, e.code);

/**
 * Map a test name as printed on a report to a catalog code.
 * Exact alias first, then the longest alias contained as a whole phrase.
 * Very short aliases (≤3 chars, e.g. "k", "hb", "tsh") only match exactly or
 * as the first word, to avoid "Vitamin K" -> potassium style mistakes.
 */
export function matchBiomarker(rawName: string): string | null {
  const name = normalizeTestName(rawName);
  if (!name) return null;
  const exact = EXACT.get(name);
  if (exact) return exact;
  const padded = ` ${name} `;
  for (const e of ALIASES) {
    if (e.short) {
      if (name.startsWith(`${e.alias} `)) return e.code;
      continue;
    }
    if (padded.includes(` ${e.alias} `)) return e.code;
  }
  return null;
}

const KNOWN_UNITS = new Set(
  BIOMARKER_LIST.flatMap((b) => [b.unitKey, ...Object.keys(b.convert ?? {})]).filter(Boolean),
);
const COUNT_UNITS = new Set(["/ul", "10^3/ul", "lakh/ul", "10^6/ul"]);

export function ageOn(dateOfBirth: string | null | undefined, on: string | Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const at = typeof on === "string" ? new Date(on) : on;
  if (Number.isNaN(dob.getTime()) || Number.isNaN(at.getTime())) return null;
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const m = at.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function defaultRange(b: Biomarker, sex?: Sex | null, age?: number | null): { low?: number; high?: number } | null {
  for (const r of b.ranges) {
    if (r.sex && r.sex !== sex) continue;
    if (r.minAge !== undefined && (age == null || age < r.minAge)) continue;
    if (r.maxAge !== undefined && (age == null || age > r.maxAge)) continue;
    return { low: r.low, high: r.high };
  }
  return null;
}

export function computeFlag(
  value: number,
  low: number | null | undefined,
  high: number | null | undefined,
  critical?: { low?: number; high?: number },
): Flag {
  if (critical?.low !== undefined && value < critical.low) return "critical_low";
  if (critical?.high !== undefined && value > critical.high) return "critical_high";
  if (low == null && high == null) return "unknown";
  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  return "normal";
}

export function qualitativeFlag(b: Biomarker | undefined, text: string): Flag {
  if (!b?.qualitativeNormal) return "unknown";
  const t = text.trim().toLowerCase();
  return b.qualitativeNormal.some((n) => t === n || t.startsWith(n)) ? "normal" : "abnormal";
}

export function bandFor(b: Biomarker, value: number) {
  if (!b.bands) return null;
  return b.bands.find((band) => band.below === undefined || value < band.below) ?? null;
}

export type RawTest = {
  name: string;
  value: string | number | null;
  unit?: string | null;
  range?: string | null;
  flag?: string | null;
  /** optional code suggested by an LLM; validated against the catalog */
  code?: string | null;
};

export type NormalizedObservation = {
  code: string | null;
  name: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  flag: Flag;
  /** the value string as printed, used for source verification */
  printedValue: string | null;
};

function applyConversion(conv: number | ((v: number) => number), v: number): number {
  return typeof conv === "function" ? conv(v) : v * conv;
}

const round = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Turn a raw extracted row into a canonical observation: match the catalog,
 * convert into canonical units (incl. Indian "lakhs/cumm"), pick reference
 * ranges (report first, catalog default second) and compute the flag.
 */
export function normalizeTest(raw: RawTest, ctx: { sex?: Sex | null; age?: number | null } = {}): NormalizedObservation | null {
  const name = (raw.name ?? "").toString().trim().slice(0, 160);
  if (!name) return null;
  const printed = raw.value === null || raw.value === undefined ? null : String(raw.value).trim();
  const pv = parseValue(raw.value);
  if (pv.num === null && !pv.text) return null;
  const unitKey = normalizeUnit(raw.unit ?? null);

  let code = matchBiomarker(name);
  if (!code && raw.code && getBiomarker(raw.code.toUpperCase())) code = raw.code.toUpperCase();
  let b = getBiomarker(code);

  if (b) {
    const qualitative = pv.num === null && !!pv.text;
    if (qualitative && b.qualitativeAlt && !b.qualitativeNormal) b = getBiomarker(b.qualitativeAlt);
    else if (!qualitative && b.qualitativeNormal && b.ranges.length === 0) {
      b = b.numericAlt ? getBiomarker(b.numericAlt) : undefined;
    }
  }
  if (b?.countAlt && pv.num !== null && ((unitKey && COUNT_UNITS.has(unitKey)) || (!unitKey && pv.num > 100))) {
    b = getBiomarker(b.countAlt);
  }

  let factor: number | ((v: number) => number) = 1;
  if (b && pv.num !== null) {
    if (unitKey && unitKey !== b.unitKey) {
      const conv = b.convert?.[unitKey];
      if (conv !== undefined) factor = conv;
      else if (KNOWN_UNITS.has(unitKey)) b = undefined; // incompatible known unit: don't force a match
    } else if (!unitKey) {
      // Unit missing: infer the common Indian notations from magnitude.
      if (b.code === "PLT") factor = pv.num > 2000 ? 0.001 : pv.num < 20 ? 100 : 1;
      if (b.code === "WBC" && pv.num > 200) factor = 0.001;
      if (b.code === "ANC" || b.code === "ALC") factor = pv.num > 100 ? 0.001 : 1;
    }
  }
  code = b?.code ?? null;

  const range = parseRange(raw.range ?? null);
  let refLow = range.low;
  let refHigh = range.high;
  let valueNum = pv.num;
  if (b && valueNum !== null && factor !== 1) {
    valueNum = round(applyConversion(factor, valueNum));
    if (refLow !== null) refLow = round(applyConversion(factor, refLow));
    if (refHigh !== null) refHigh = round(applyConversion(factor, refHigh));
  }
  if (b && (refLow !== null || refHigh !== null)) {
    // A printed range wildly inconsistent with the usual one (e.g. OCR reading
    // "1.5 - 4.1 lakhs" as "15 - 41") would create false flags: fall back to the default.
    const d = defaultRange(b, ctx.sex, ctx.age);
    const off = (x: number | null, y: number | undefined) => x !== null && y !== undefined && y > 0 && x > 0 && (x / y > 4 || y / x > 4);
    if (d && (off(refLow, d.low) || off(refHigh, d.high))) {
      refLow = null;
      refHigh = null;
    }
  }
  if (b && refLow === null && refHigh === null) {
    const d = defaultRange(b, ctx.sex, ctx.age);
    refLow = d?.low ?? null;
    refHigh = d?.high ?? null;
  }

  let flag: Flag = "unknown";
  if (valueNum !== null) {
    flag = computeFlag(valueNum, refLow, refHigh, b?.critical);
    if (flag === "unknown" && pv.flagHint) flag = pv.flagHint === "H" ? "high" : "low";
  } else if (pv.text) {
    flag = qualitativeFlag(b, pv.text);
    if (flag === "unknown" && isQualitativeText(pv.text) && /positive|reactive|present|\+/i.test(pv.text)) flag = "abnormal";
  }
  if (flag === "unknown" && raw.flag) {
    const f = raw.flag.toString().trim().toUpperCase();
    if (f.startsWith("H")) flag = "high";
    else if (f.startsWith("L")) flag = "low";
  }

  return {
    code,
    name,
    valueNum,
    valueText: pv.text,
    unit: b ? b.unit || null : (raw.unit ?? null)?.toString().trim().slice(0, 40) || null,
    refLow,
    refHigh,
    refText: range.text,
    flag,
    printedValue: printed,
  };
}

export function isAbnormal(flag: string): boolean {
  return flag !== "normal" && flag !== "unknown";
}

export function isCritical(flag: string): boolean {
  return flag === "critical_low" || flag === "critical_high";
}
