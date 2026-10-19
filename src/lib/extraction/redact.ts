/**
 * Remove personal identifiers from report text before it is sent to a
 * third-party (free-tier) LLM. Lab values, units, ranges, age and sex are
 * kept because they are needed for extraction and are not identifying on
 * their own. This is a data-minimisation step required by our privacy
 * design (DPDP Act purpose limitation), not a guarantee: anything that
 * cannot be safely redacted (photos/scans) is never sent to untrusted
 * providers at all.
 */

const LABELS = [
  "patient'?s? name", "pt\\.? name", "name of patient", "patient", "name", "mr\\.?", "mrs\\.?", "ms\\.?", "miss",
  "baby of", "b\\/o", "s\\/o", "d\\/o", "w\\/o", "c\\/o", "father'?s? name", "husband'?s? name", "guardian",
  "address", "addr\\.?", "mobile( no\\.?)?", "mob\\.?( no\\.?)?", "phone( no\\.?)?", "tel\\.?( no\\.?)?", "contact( no\\.?)?",
  "e-?mail( id)?", "uhid", "mrn", "ip no\\.?", "op no\\.?", "patient id", "pid", "reg(istration)?\\.? ?(no|id)\\.?",
  "lab ?(no|id)\\.?", "sample ?(no|id)\\.?", "barcode", "accession( no\\.?)?", "visit ?(no|id)", "aadhaa?r( no\\.?| number)?",
  "abha( number| no\\.?| id| address)?", "health id", "ref(erred)?\\.? ?by", "referring (doctor|physician)", "ref\\.? ?dr\\.?",
  "consultant", "dob", "d\\.o\\.b\\.?", "date of birth", "passport( no\\.?)?", "policy( no\\.?)?", "employee id", "emp\\.? id",
];

// "<label> : value" up to a column gap (2+ spaces) or end of line.
const LABEL_RE = new RegExp(
  `(^|\\s{2,}|\\|)\\s*(${LABELS.map((l) => l.replace(/\((?!\?)/g, "(?:")).join("|")})\\s*[:\\-.]\\s*([^\\n]*?)(?=\\s{2,}|\\||$)`,
  "gim",
);
// Signature lines like "Dr. Anil Kumar, MD (Path)"
const DOCTOR_RE = /\b(Dr\.?)\s+[A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,3}/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)*/g;
const IN_MOBILE_RE = /(?<!\d)(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const LANDLINE_RE = /(?<![\d.])0\d{2,4}[\s-]\d{6,8}(?!\d)/g;
const AADHAAR_RE = /(?<!\d)\d{4}[\s-]\d{4}[\s-]\d{4}(?!\d)/g;
const ABHA_RE = /(?<!\d)\d{2}-\d{4}-\d{4}-\d{4}(?!\d)|(?<!\d)\d{14}(?!\d)/g;
const PIN_RE = /\b(pin(\s?code)?|pincode)\s*[:\-]?\s*\d{6}\b/gi;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type RedactOptions = { names?: (string | null | undefined)[]; emails?: (string | null | undefined)[] };

export function redactPII(text: string, opts: RedactOptions = {}): { text: string; count: number } {
  let count = 0;
  const bump = (replacement: string) => () => {
    count++;
    return replacement;
  };
  let out = text.replace(LABEL_RE, (_m, pre: string, label: string, value: string) => {
    if (!value.trim()) return _m;
    count++;
    return `${pre}${label}: [REDACTED]`;
  });
  for (const email of opts.emails ?? []) {
    if (email) out = out.replace(new RegExp(escapeRegExp(email), "gi"), bump("[EMAIL]"));
  }
  out = out.replace(EMAIL_RE, (m) => (m.includes("@") ? (count++, "[EMAIL]") : m));
  out = out.replace(ABHA_RE, bump("[ID]"));
  out = out.replace(AADHAAR_RE, bump("[ID]"));
  out = out.replace(IN_MOBILE_RE, bump("[PHONE]"));
  out = out.replace(LANDLINE_RE, bump("[PHONE]"));
  out = out.replace(PIN_RE, (m) => (count++, m.replace(/\d{6}/, "[PIN]")));
  out = out.replace(DOCTOR_RE, bump("Dr. [NAME]"));

  const tokens = new Set<string>();
  for (const n of opts.names ?? []) {
    if (!n) continue;
    const full = n.trim();
    if (full.length >= 3) tokens.add(full);
    for (const part of full.split(/\s+/)) if (part.length >= 3) tokens.add(part);
  }
  // Longest first so full names are replaced before their parts.
  for (const t of [...tokens].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRegExp(t)}(?![\\p{L}])`, "giu"), bump("[NAME]"));
  }
  return { text: out, count };
}
