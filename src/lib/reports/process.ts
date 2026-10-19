import { and, eq } from "drizzle-orm";
import { aad, decryptOptional, encryptOptional, encryptText } from "../crypto";
import { getDb, withUser } from "../db";
import { observations, profiles, reports, users } from "../db/schema";
import { extractDocument, type Medication } from "../extraction/pipeline";
import type { AllowedMime } from "../files";
import type { Sex } from "../medical/biomarkers";
import { ageOn } from "../medical/normalize";
import { readEncryptedFile } from "../storage";

export type ReportExtras = {
  documentType: string;
  medications: Medication[];
  diagnoses: string[];
  summary: string | null;
  warnings: string[];
  patientSex: string | null;
  patientAge: number | null;
};

const REVIEW_WARNINGS = new Set(["unverified_values", "sex_mismatch", "no_results", "no_text", "ocr_suspect_values"]);

const DOC_CATEGORY: Record<string, string> = {
  lab_report: "lab",
  prescription: "prescription",
  discharge_summary: "discharge",
  imaging_report: "imaging",
};

// Keep CPU-heavy OCR/LLM work bounded per instance.
const MAX_CONCURRENT = Number(process.env.EXTRACTION_CONCURRENCY ?? 2);
let running = 0;
const queue: (() => void)[] = [];
async function acquire() {
  if (running < MAX_CONCURRENT) {
    running++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  running++;
}
function release() {
  running--;
  queue.shift()?.();
}

export function decodeExtras(userId: string, reportId: string, enc: string | null): ReportExtras | null {
  const json = decryptOptional(userId, enc, aad.reportField(reportId, "extras"));
  if (!json) return null;
  try {
    return JSON.parse(json) as ReportExtras;
  } catch {
    return null;
  }
}

/** Extract structured results from an uploaded report. Safe to call again to re-run. */
export async function processReport(userId: string, reportId: string): Promise<void> {
  await acquire();
  try {
    await run(userId, reportId);
  } finally {
    release();
  }
}

async function run(userId: string, reportId: string) {
  const ctx = await withUser(userId, async (tx) => {
    const [r] = await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!r) return null;
    const [p] = await tx.select().from(profiles).where(eq(profiles.id, r.profileId)).limit(1);
    return p ? { r, p } : null;
  });
  if (!ctx?.r.fileKey || !ctx.r.mimeType) return;
  const { r, p } = ctx;
  const [u] = await getDb()
    .select({ name: users.name, email: users.email, aiConsent: users.aiConsent })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;

  try {
    const data = await readEncryptedFile(userId, r.fileKey!);
    const today = new Date().toISOString().slice(0, 10);
    const result = await extractDocument({
      data,
      mime: r.mimeType as AllowedMime,
      aiConsent: u.aiConsent,
      redactNames: [u.name, p.name],
      redactEmails: [u.email],
      profileSex: (p.sex === "male" || p.sex === "female" ? p.sex : null) as Sex | null,
      profileAge: ageOn(p.dateOfBirth, r.reportDate ?? today),
    });
    const reportDate = r.reportDate ?? result.reportDate;
    const observedAt = reportDate ?? r.createdAt.toISOString().slice(0, 10);
    const extras: ReportExtras = {
      documentType: result.documentType,
      medications: result.medications,
      diagnoses: result.diagnoses,
      summary: result.summary,
      warnings: result.warnings,
      patientSex: result.patientSex,
      patientAge: result.patientAge,
    };

    await withUser(userId, async (tx) => {
      // Re-runs replace extracted rows but keep anything the user corrected by hand.
      await tx
        .delete(observations)
        .where(and(eq(observations.reportId, reportId), eq(observations.userEdited, false)));
      const kept = await tx
        .select({ code: observations.biomarkerCode, name: observations.name })
        .from(observations)
        .where(eq(observations.reportId, reportId));
      const keptKeys = new Set(kept.map((k) => k.code ?? `name:${k.name.toLowerCase()}`));
      const rows = result.observations
        .filter((o) => !keptKeys.has(o.code ?? `name:${o.name.toLowerCase()}`))
        .map((o) => ({
          userId,
          profileId: r.profileId,
          reportId,
          biomarkerCode: o.code,
          name: o.name,
          valueNum: o.valueNum,
          valueText: o.valueText,
          unit: o.unit,
          refLow: o.refLow,
          refHigh: o.refHigh,
          refText: o.refText,
          flag: o.flag,
          observedAt,
          source: "report",
          verified: o.verified,
        }));
      if (rows.length) await tx.insert(observations).values(rows);
      await tx
        .update(reports)
        .set({
          status: result.warnings.some((w) => REVIEW_WARNINGS.has(w)) ? "needs_review" : "ready",
          labName: r.labName ?? result.labName,
          reportDate,
          category: r.category === "auto" ? (DOC_CATEGORY[result.documentType] ?? "other") : r.category,
          extractionMethod: result.method,
          ocrUsed: result.ocrUsed,
          rawTextEnc: encryptOptional(userId, result.text, aad.reportField(reportId, "raw_text")),
          extrasEnc: encryptText(userId, JSON.stringify(extras), aad.reportField(reportId, "extras")),
          processedAt: new Date(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(reports.id, reportId));
    });
  } catch (err) {
    console.error(`[extract] report ${reportId} failed: ${err instanceof Error ? err.message : String(err)}`);
    await withUser(userId, (tx) =>
      tx
        .update(reports)
        .set({ status: "failed", error: "extraction_failed", updatedAt: new Date() })
        .where(eq(reports.id, reportId)),
    );
  }
}
