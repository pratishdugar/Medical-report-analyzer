import type { AllowedMime } from "../files";
import type { Sex } from "../medical/biomarkers";
import { normalizeTest, type NormalizedObservation, type RawTest } from "../medical/normalize";
import { canonicalNumber, numbersIn, parseReportDate } from "../medical/units";
import { chatJSON, configuredProviders, LLMError, type Provider } from "./llm";
import { chunkText, EXTRACTION_SYSTEM_PROMPT, extractionUserPrompt, LLMExtractionSchema, type LLMExtraction } from "./prompt";
import { redactPII } from "./redact";
import { parseLabText } from "./rules";
import { extractPdfText, looksScanned, ocrAvailable, ocrDocument, pdfToPngs } from "./text";

export type ExtractedObservation = NormalizedObservation & { verified: boolean };

export type Medication = { name: string; dose?: string | null; frequency?: string | null; duration?: string | null };

export type ExtractionResult = {
  method: string;
  ocrUsed: boolean;
  text: string | null;
  documentType: string;
  labName: string | null;
  reportDate: string | null;
  patientSex: Sex | null;
  patientAge: number | null;
  observations: ExtractedObservation[];
  medications: Medication[];
  diagnoses: string[];
  summary: string | null;
  warnings: string[];
};

export type ExtractionInput = {
  data: Buffer;
  mime: AllowedMime;
  /** user consented to sending redacted text to third-party AI providers */
  aiConsent: boolean;
  /** names/emails to strip before text leaves the server */
  redactNames: (string | null | undefined)[];
  redactEmails: (string | null | undefined)[];
  profileSex: Sex | null;
  profileAge: number | null;
};

/** True if the printed value appears in the source text (anti-hallucination). */
export function verifyAgainstText(printed: string | null, sourceNumbers: Set<string>, sourceLower: string): boolean {
  if (!printed) return false;
  const num = printed.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/);
  if (num) return sourceNumbers.has(canonicalNumber(num[0]));
  return sourceLower.includes(printed.toLowerCase());
}

/**
 * OCR commonly drops decimal points ("31.5" -> "315"). Values wildly outside
 * the printed range that would fit it after shifting the decimal are flagged
 * for the user to verify instead of being trusted.
 */
export function looksLikeOcrSlip(o: NormalizedObservation): boolean {
  const v = o.valueNum;
  if (v === null) return false;
  if (o.refHigh !== null && o.refHigh > 0 && v > o.refHigh * 3 && v / 10 <= o.refHigh * 1.5) return true;
  if (o.refLow !== null && o.refLow > 0 && v < o.refLow / 3 && v * 10 >= o.refLow * 0.7 && v * 10 <= (o.refHigh ?? Infinity) * 1.5) return true;
  return false;
}

function toSex(v: string | null | undefined): Sex | null {
  if (!v) return null;
  const s = v.toLowerCase();
  return s.startsWith("m") ? "male" : s.startsWith("f") ? "female" : null;
}

async function llmFromText(provider: Provider, text: string, redact: boolean, opts: ExtractionInput) {
  const prepared = redact ? redactPII(text, { names: opts.redactNames, emails: opts.redactEmails }).text : text;
  const { chunks, truncated } = chunkText(prepared);
  const merged: LLMExtraction = { tests: [], medications: [], diagnoses: [] } as unknown as LLMExtraction;
  for (let i = 0; i < chunks.length; i++) {
    const raw = await chatJSON(provider, [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: extractionUserPrompt(chunks[i], { index: i + 1, total: chunks.length }) },
    ]);
    const parsed = LLMExtractionSchema.safeParse(raw);
    if (!parsed.success) throw new LLMError(`${provider.label} returned JSON in an unexpected shape`);
    const p = parsed.data;
    merged.document_type ??= p.document_type;
    merged.lab_name ??= p.lab_name;
    merged.collection_date ??= p.collection_date;
    merged.report_date ??= p.report_date;
    merged.patient_sex ??= p.patient_sex;
    merged.patient_age_years ??= p.patient_age_years;
    merged.summary ??= p.summary;
    merged.tests.push(...p.tests);
    merged.medications.push(...p.medications);
    merged.diagnoses.push(...p.diagnoses);
  }
  return { result: merged, truncated };
}

async function llmFromImages(provider: Provider, images: { data: Buffer; mime: string }[]) {
  const raw = await chatJSON(
    provider,
    [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the data from this document image." },
          ...images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mime};base64,${img.data.toString("base64")}` },
          })),
        ],
      },
    ],
    { model: provider.visionModel },
  );
  const parsed = LLMExtractionSchema.safeParse(raw);
  if (!parsed.success) throw new LLMError(`${provider.label} returned JSON in an unexpected shape`);
  return parsed.data;
}

export async function extractDocument(input: ExtractionInput): Promise<ExtractionResult> {
  const warnings: string[] = [];
  let text: string | null = null;
  let ocrUsed = false;

  if (input.mime === "application/pdf") {
    const pdf = await extractPdfText(input.data);
    text = pdf.text;
    if (looksScanned(pdf.text, pdf.pages)) {
      text = null;
      if (await ocrAvailable()) {
        text = await ocrDocument(input.data, input.mime);
        ocrUsed = true;
      }
    }
  } else if (await ocrAvailable()) {
    text = await ocrDocument(input.data, input.mime);
    ocrUsed = true;
  }
  if (text !== null && !text.trim()) text = null;

  const rules = text ? parseLabText(text) : null;
  const providers = configuredProviders();
  let llm: LLMExtraction | null = null;
  let method = "rules";
  const errors: string[] = [];

  for (const provider of providers) {
    // Untrusted (third-party, free-tier) providers need explicit consent and only get redacted text.
    if (!provider.trusted && !input.aiConsent) continue;
    try {
      if (text) {
        const out = await llmFromText(provider, text, !provider.trusted, input);
        llm = out.result;
        if (out.truncated) warnings.push("long_document_truncated");
      } else if (provider.trusted && provider.visionModel) {
        const images =
          input.mime === "application/pdf"
            ? (await pdfToPngs(input.data)).map((data) => ({ data, mime: "image/png" }))
            : [{ data: input.data, mime: input.mime }];
        llm = await llmFromImages(provider, images);
      } else {
        continue;
      }
      method = `llm:${provider.id}/${text ? provider.model : provider.visionModel}`;
      break;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (errors.length && !llm) warnings.push("ai_unavailable");

  const sex = toSex(llm?.patient_sex) ?? rules?.patientSex ?? null;
  const ageRaw = llm?.patient_age_years ?? rules?.patientAge ?? null;
  const patientAge = ageRaw !== null && Number(ageRaw) > 0 && Number(ageRaw) < 120 ? Math.round(Number(ageRaw)) : null;
  const ctx = { sex: input.profileSex ?? sex, age: input.profileAge ?? patientAge };

  const sourceNumbers = text ? numbersIn(text) : new Set<string>();
  const sourceLower = (text ?? "").toLowerCase();
  const observations: ExtractedObservation[] = [];
  const seen = new Set<string>();
  const push = (raw: RawTest, fromRules: boolean) => {
    const n = normalizeTest(raw, ctx);
    if (!n) return;
    const key = n.code ?? `name:${n.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    let verified = fromRules || (text ? verifyAgainstText(n.printedValue, sourceNumbers, sourceLower) : false);
    if (verified && ocrUsed && looksLikeOcrSlip(n)) {
      verified = false;
      if (!warnings.includes("ocr_suspect_values")) warnings.push("ocr_suspect_values");
    }
    observations.push({ ...n, verified });
  };
  for (const t of llm?.tests ?? []) {
    push({ name: t.name, value: t.value, unit: t.unit, range: t.reference_range, flag: t.flag, code: t.code }, false);
  }
  for (const t of rules?.tests ?? []) push(t, true);

  const reportDate =
    parseReportDate(llm?.collection_date) ?? parseReportDate(llm?.report_date) ?? rules?.reportDate ?? null;
  const unverified = observations.filter((o) => !o.verified).length;
  if (unverified) warnings.push("unverified_values");
  if (ocrUsed) warnings.push("ocr_used");
  if (!text && !llm) warnings.push("no_text");
  if (input.profileSex && sex && input.profileSex !== sex) warnings.push("sex_mismatch");
  if (!observations.length && (llm?.document_type ?? "lab_report") === "lab_report") warnings.push("no_results");

  return {
    method,
    ocrUsed,
    text,
    documentType: llm?.document_type ?? (observations.length ? "lab_report" : "other"),
    labName: llm?.lab_name?.slice(0, 120) ?? rules?.labName ?? null,
    reportDate,
    patientSex: sex,
    patientAge,
    observations,
    medications: (llm?.medications ?? []).slice(0, 50),
    diagnoses: (llm?.diagnoses ?? []).slice(0, 30),
    summary: llm?.summary ?? null,
    warnings,
  };
}
