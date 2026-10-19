import { z } from "zod";
import { BIOMARKER_LIST } from "../medical/biomarkers";

const CODE_LIST = BIOMARKER_LIST.map((b) => `${b.code}=${b.name}`).join("; ");

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise medical document data-extraction engine for Indian healthcare documents (lab reports from labs like Thyrocare, Dr Lal PathLabs, SRL/Agilus, Metropolis, Apollo; prescriptions; discharge summaries; imaging reports).

Rules:
- Extract ONLY information explicitly printed in the document. Never guess, infer, calculate or fill in missing values.
- Copy each test result value EXACTLY as printed (e.g. "1,50,000", "2.5", "<0.5", "Nil"). Copy units and reference ranges exactly as printed.
- Indian dates are day-first (DD/MM/YYYY). Copy dates as printed.
- Include every test result row, including CBC differentials, urine routine and calculated ratios.
- If a value is flagged on the report (H/L/High/Low/*), put "H" or "L" in "flag".
- For "code", choose the matching code from this list or null if none fits: ${CODE_LIST}
- Text like [REDACTED], [NAME], [PHONE] is intentionally removed personal data; ignore it.
- Respond with a single JSON object only, no commentary.

JSON schema:
{
  "document_type": "lab_report" | "prescription" | "discharge_summary" | "imaging_report" | "other",
  "lab_name": string | null,
  "collection_date": string | null,
  "report_date": string | null,
  "patient_sex": "male" | "female" | null,
  "patient_age_years": number | null,
  "tests": [{ "name": string, "value": string, "unit": string | null, "reference_range": string | null, "flag": "H" | "L" | null, "code": string | null }],
  "medications": [{ "name": string, "dose": string | null, "frequency": string | null, "duration": string | null }],
  "diagnoses": [string],
  "summary": string | null
}
"summary": for non-lab documents only, 1-3 neutral sentences describing what the document says (no advice). Use null for lab reports.`;

export function extractionUserPrompt(text: string, part?: { index: number; total: number }) {
  const partNote = part && part.total > 1 ? `This is part ${part.index} of ${part.total} of the document.\n` : "";
  return `${partNote}Extract the data from this document text:\n"""\n${text}\n"""`;
}

const str = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .nullish();

export const LLMExtractionSchema = z.object({
  document_type: z.string().nullish(),
  lab_name: z.string().nullish(),
  collection_date: str,
  report_date: str,
  patient_sex: z.string().nullish(),
  patient_age_years: z.union([z.number(), z.string()]).nullish(),
  tests: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        value: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
        unit: str,
        reference_range: str,
        flag: z.string().nullish(),
        code: z.string().nullish(),
      }),
    )
    .max(400)
    .default([]),
  medications: z
    .array(z.object({ name: z.string().min(1).max(200), dose: str, frequency: str, duration: str }))
    .max(100)
    .default([]),
  diagnoses: z.array(z.string().max(300)).max(50).default([]),
  summary: z.string().max(2000).nullish(),
});

export type LLMExtraction = z.infer<typeof LLMExtractionSchema>;

/** Split long text on line boundaries so each chunk fits free-tier limits. */
export function chunkText(text: string, maxChars = 12000, maxChunks = 6): { chunks: string[]; truncated: boolean } {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (cur.length + line.length + 1 > maxChars && cur) {
      chunks.push(cur);
      cur = "";
    }
    cur += (cur ? "\n" : "") + line.slice(0, maxChars);
  }
  if (cur.trim()) chunks.push(cur);
  return { chunks: chunks.slice(0, maxChunks), truncated: chunks.length > maxChunks };
}

export const SUMMARY_SYSTEM_PROMPT = `You explain medical lab results to patients in India in simple, warm, non-alarming language.
Rules:
- Use ONLY the structured results provided. Do not invent values or diagnoses.
- Explain what is normal, what is out of range and what that commonly means, in plain words.
- Give general lifestyle tips relevant to India (foods like dal, millets, green leafy vegetables) where appropriate.
- Never prescribe medicines or doses. Always recommend discussing results with a doctor; for critical values advise contacting a doctor promptly.
- Keep it under 250 words, use short paragraphs or bullet points.
- Respond as JSON: {"summary": string}`;
