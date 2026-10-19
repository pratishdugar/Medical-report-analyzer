import { getBiomarker } from "../medical/biomarkers";
import { matchBiomarker, type RawTest } from "../medical/normalize";
import { parseReportDate } from "../medical/units";

/*
 * Deterministic, offline parser for lab report text. It only emits rows
 * whose name matches the biomarker catalog, so precision is high even when
 * recall is lower than an LLM. Used on its own when no LLM is configured (or
 * the user hasn't consented to AI processing), and to back-fill/verify LLM
 * output otherwise.
 */

export type RulesResult = {
  tests: RawTest[];
  reportDate: string | null;
  labName: string | null;
  patientSex: "male" | "female" | null;
  patientAge: number | null;
};

const NUM_TOKEN = /^[<>≤≥]?=?\d[\d,]*(?:\.\d+)?(?:[HL]\b)?\*?$/i;
const FLAG_TOKEN = /^\(?(H|L|HIGH|LOW|High|Low|\*+)\)?$/;
const QUAL_START = /^(nil|negative|absent|present|trace|positive|not\s+detected|detected|reactive|non[-\s]?reactive|occasional|\+{1,4})\b/i;
const RANGE_RE = /(\d[\d,]*(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d[\d,]*(?:\.\d+)?)|(?:<=?|>=?|≤|≥|upto|up\s+to|less\s+than|more\s+than)\s*\d[\d,]*(?:\.\d+)?/i;

const LAB_NAMES = [
  "Thyrocare", "Dr Lal PathLabs", "Dr. Lal PathLabs", "Lal PathLabs", "SRL Diagnostics", "Agilus Diagnostics", "Metropolis",
  "Apollo Diagnostics", "Apollo Hospitals", "Redcliffe Labs", "Healthians", "Tata 1mg", "1mg Labs", "Max Lab", "Max Healthcare",
  "Neuberg", "Vijaya Diagnostic", "Suburban Diagnostics", "Orange Health", "Pathkind", "Medall", "Lucid Diagnostics",
  "Aarthi Scans", "Krsnaa Diagnostics", "Core Diagnostics", "Oncquest", "Fortis", "Manipal Hospitals", "AIIMS",
  "Mahajan Imaging", "Sterling Accuris", "Tenet Diagnostics", "Igenetic", "PharmEasy", "Niramaya",
];

const UNIT_WORD = /^(lakhs?|lacs?|millions?|mill|thou(sand)?|cells?|cumm|percent|units?|mg|gms?|g|iu|fl|pg|ng|nmol|pmol|umol|mmol|mmhg|bpm|mm|hrs?|ratio|index|kg|cm)$/i;

function cleanUnit(s: string): string | null {
  const u = s
    .split(/\s+/)
    .filter((t) => t && !FLAG_TOKEN.test(t))
    .join(" ")
    .replace(/^[:\-|]+|[:\-|]+$/g, "")
    .trim();
  if (!u || u.length > 25) return null;
  const looksLikeUnit =
    /[/%^]/.test(u) ||
    UNIT_WORD.test(u) ||
    /^(g|mg|ng|pg|µg|μg|ug|mcg|mmol|umol|µmol|nmol|pmol|meq|iu|miu|uiu|µiu|cells|lakh|mill|10|x10|fl|°)/i.test(u);
  return looksLikeUnit ? u : null;
}

function parseRest(rest: string): { unit: string | null; range: string | null; flag: string | null } {
  const flagTok = rest.split(/\s+/).find((t) => FLAG_TOKEN.test(t)) ?? null;
  const flag = flagTok && /h/i.test(flagTok) ? "H" : flagTok && /l/i.test(flagTok) ? "L" : null;
  const m = rest.match(RANGE_RE);
  if (!m || m.index === undefined) return { unit: cleanUnit(rest.split(/\s{2,}/)[0] ?? ""), range: null, flag };
  const before = rest.slice(0, m.index);
  const after = rest.slice(m.index + m[0].length);
  const unit = cleanUnit(before) ?? cleanUnit(after.split(/\s{2,}/).filter(Boolean)[0] ?? "");
  return { unit, range: m[0].trim(), flag };
}

export function parseLabLine(line: string): RawTest | null {
  const cleaned = line.replace(/\t/g, "  ").replace(/[|]/g, "  ").replace(/\s+:\s+/g, "  ").trim();
  if (cleaned.length < 3 || cleaned.length > 220) return null;
  const tokens = [...cleaned.matchAll(/\S+/g)].map((m) => ({ t: m[0], at: m.index ?? 0 }));
  for (let i = 1; i < tokens.length; i++) {
    const { t: tok, at } = tokens[i];
    const name = cleaned.slice(0, at).replace(/\s+/g, " ").replace(/[:\-–]+\s*$/, "").trim();
    if (!/[a-z]/i.test(name)) continue;
    if (NUM_TOKEN.test(tok)) {
      const code = matchBiomarker(name);
      if (!code) continue;
      // "Vitamin D 25 Hydroxy  18.2": the 25 belongs to the name, not the value.
      const next = tokens[i + 1]?.t;
      if (next && /^[a-z]{3,}$/i.test(next) && !UNIT_WORD.test(next) && matchBiomarker(`${name} ${tok} ${next}`) === code) {
        continue;
      }
      const { unit, range, flag } = parseRest(cleaned.slice(at + tok.length).trim());
      return { name, value: tok, unit, range, flag, code };
    }
    const tail = cleaned.slice(at);
    if (QUAL_START.test(tail)) {
      const code = matchBiomarker(name);
      const b = getBiomarker(code);
      if (!code || !b || (!b.qualitativeNormal && !b.qualitativeAlt)) continue;
      return { name, value: tail.match(QUAL_START)![0], unit: null, range: null, flag: null, code };
    }
  }
  return null;
}

function findDate(lines: string[]): string | null {
  const groups = [
    /(sample\s*)?(collected|collection|drawn)(\s*(on|date|at))?/i,
    /(reported|report(ing)?\s*date|date\s*of\s*report|released)/i,
    /(registered|registration|received|booking|billing|visit)\s*(on|date)?/i,
    /\bdate\b/i,
  ];
  for (const re of groups) {
    for (const line of lines) {
      const m = line.match(re);
      if (!m || m.index === undefined) continue;
      const d = parseReportDate(line.slice(m.index + m[0].length, m.index + m[0].length + 40));
      if (d) return d;
    }
  }
  return null;
}

export function parseLabText(text: string): RulesResult {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const tests: RawTest[] = [];
  for (const line of lines) {
    const t = parseLabLine(line);
    if (!t || !t.code) continue;
    const key = `${t.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tests.push(t);
  }
  const head = lines.slice(0, 40).join("\n");
  const sexMatch =
    head.match(/(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b/i) ??
    head.match(/\d{1,3}\s*(?:y|yrs?|years?)\s*[\/,]\s*(male|female|m|f)\b/i);
  const ageMatch = head.match(/\bage\b[^\n\d]{0,12}(\d{1,3})\s*(?:y|yrs?|years?)?/i) ?? head.match(/\b(\d{1,3})\s*(?:y|yrs?|years?)\s*[\/,]\s*(?:male|female|m|f)\b/i);
  const lower = text.toLowerCase();
  const lab = LAB_NAMES.find((n) => lower.includes(n.toLowerCase())) ?? null;
  const age = ageMatch ? Number(ageMatch[1]) : null;
  return {
    tests,
    reportDate: findDate(lines),
    labName: lab,
    patientSex: sexMatch ? (sexMatch[1].toLowerCase().startsWith("m") ? "male" : "female") : null,
    patientAge: age !== null && age > 0 && age < 120 ? age : null,
  };
}
