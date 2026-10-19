"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hit } from "@/lib/auth/rate-limit";
import { aad, encryptOptional } from "@/lib/crypto";
import { requireUser } from "@/lib/dal";
import { isUuid, withUser } from "@/lib/db";
import { historyEntries, observations, profiles, reports } from "@/lib/db/schema";
import { normalizeLocale } from "@/lib/i18n";
import { getBiomarker, type Sex } from "@/lib/medical/biomarkers";
import { ageOn, normalizeTest } from "@/lib/medical/normalize";
import { processReport } from "@/lib/reports/process";
import { generateReportSummary } from "@/lib/reports/summary";
import { requestMeta } from "@/lib/request";
import { deleteEncryptedFile } from "@/lib/storage";
import { optionalIsoDate, REPORT_CATEGORIES, str, type ActionState } from "@/lib/validation";

async function ownedReport(userId: string, id: string) {
  if (!isUuid(id)) return null;
  const [r] = await withUser(userId, (tx) => tx.select().from(reports).where(eq(reports.id, id)).limit(1));
  return r ?? null;
}

export async function updateReportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const report = await ownedReport(user.id, str(fd, "id"));
  if (!report) return { error: "common.notFound" };
  const parsed = z
    .object({
      title: z.string().trim().max(120),
      labName: z.string().trim().max(120),
      reportDate: optionalIsoDate,
      category: z.enum(REPORT_CATEGORIES),
      notes: z.string().max(5000),
    })
    .safeParse({
      title: str(fd, "title"),
      labName: str(fd, "labName"),
      reportDate: str(fd, "reportDate"),
      category: str(fd, "category") || report.category,
      notes: str(fd, "notes"),
    });
  if (!parsed.success) return { error: "common.genericError" };
  const d = parsed.data;
  await withUser(user.id, async (tx) => {
    await tx
      .update(reports)
      .set({
        title: d.title,
        labName: d.labName || null,
        reportDate: d.reportDate,
        category: d.category,
        notesEnc: encryptOptional(user.id, d.notes.trim() || null, aad.reportField(report.id, "notes")),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, report.id));
    if (d.reportDate && d.reportDate !== report.reportDate) {
      await tx.update(observations).set({ observedAt: d.reportDate, updatedAt: new Date() }).where(eq(observations.reportId, report.id));
    }
  });
  revalidatePath(`/reports/${report.id}`);
  return { ok: true, message: "common.save" };
}

export async function deleteReportAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const report = await ownedReport(user.id, str(fd, "id"));
  if (report) {
    await withUser(user.id, (tx) => tx.delete(reports).where(eq(reports.id, report.id)));
    if (report.fileKey) await deleteEncryptedFile(user.id, report.fileKey);
    await audit(user.id, "report_deleted", await requestMeta());
  }
  revalidatePath("/reports");
  redirect("/reports");
}

export async function reprocessReportAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const report = await ownedReport(user.id, str(fd, "id"));
  if (!report) redirect("/reports");
  if (!(await hit("uploadPerUser", user.id)).ok) redirect(`/reports/${report.id}?error=rate`);
  await withUser(user.id, (tx) =>
    tx.update(reports).set({ status: "processing", error: null, updatedAt: new Date() }).where(eq(reports.id, report.id)),
  );
  await audit(user.id, "report_reprocessed", await requestMeta());
  after(() => processReport(user.id, report.id));
  redirect(`/reports/${report.id}`);
}

/** Create or correct a single result. User-entered values are marked as edited and kept on re-runs. */
export async function saveObservationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  const reportId = str(fd, "reportId");
  const profileId = str(fd, "profileId");
  const name = str(fd, "name").trim().slice(0, 160);
  const value = str(fd, "value").trim().slice(0, 80);
  const code = str(fd, "code");
  if (!value || (!name && !code)) return { error: "vitals.nothing" };

  return withUser(user.id, async (tx) => {
    const existing = isUuid(id) ? (await tx.select().from(observations).where(eq(observations.id, id)).limit(1))[0] : undefined;
    const report = isUuid(reportId) ? (await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1))[0] : undefined;
    const pid = existing?.profileId ?? report?.profileId ?? (isUuid(profileId) ? profileId : null);
    if (!pid) return { error: "common.notFound" };
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, pid)).limit(1);
    if (!profile) return { error: "common.notFound" };
    const observedAt =
      optionalIsoDate.catch(null).parse(str(fd, "observedAt")) ??
      existing?.observedAt ??
      report?.reportDate ??
      new Date().toISOString().slice(0, 10);
    const b = getBiomarker(code);
    const norm = normalizeTest(
      { name: name || b?.name || code, value, unit: str(fd, "unit") || b?.unit || null, range: str(fd, "range") || null, code: code || existing?.biomarkerCode || null },
      { sex: (profile.sex === "male" || profile.sex === "female" ? profile.sex : null) as Sex | null, age: ageOn(profile.dateOfBirth, observedAt) },
    );
    if (!norm) return { error: "vitals.nothing" };
    const values = {
      biomarkerCode: norm.code,
      name: norm.name,
      valueNum: norm.valueNum,
      valueText: norm.valueText,
      unit: norm.unit,
      refLow: norm.refLow,
      refHigh: norm.refHigh,
      refText: norm.refText,
      flag: norm.flag,
      observedAt,
      verified: true,
      userEdited: true,
      updatedAt: new Date(),
    };
    if (existing) {
      await tx.update(observations).set(values).where(eq(observations.id, existing.id));
    } else {
      await tx.insert(observations).values({ ...values, userId: user.id, profileId: pid, reportId: report?.id ?? null, source: report ? "report" : "manual" });
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "common.save" };
  });
}

/** User confirms an unverified value after checking it against the original document. */
export async function confirmObservationAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  const reportId = str(fd, "reportId");
  await withUser(user.id, async (tx) => {
    if (isUuid(id)) await tx.update(observations).set({ verified: true, userEdited: true, updatedAt: new Date() }).where(eq(observations.id, id));
    else if (isUuid(reportId)) await tx.update(observations).set({ verified: true, updatedAt: new Date() }).where(eq(observations.reportId, reportId));
  });
  if (isUuid(reportId)) {
    // Once nothing is left to check, the report no longer needs review.
    await withUser(user.id, async (tx) => {
      const pending = await tx.select({ id: observations.id }).from(observations).where(and(eq(observations.reportId, reportId), eq(observations.verified, false))).limit(1);
      if (!pending.length) await tx.update(reports).set({ status: "ready", updatedAt: new Date() }).where(and(eq(reports.id, reportId), eq(reports.status, "needs_review")));
    });
  }
  revalidatePath("/", "layout");
}

export async function deleteObservationAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const id = str(fd, "id");
  if (isUuid(id)) await withUser(user.id, (tx) => tx.delete(observations).where(eq(observations.id, id)));
  const back = str(fd, "back");
  revalidatePath("/", "layout");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/trends");
}

export async function generateSummaryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  const report = await ownedReport(user.id, str(fd, "id"));
  if (!report) return { error: "common.notFound" };
  if (!(await hit("aiPerUser", user.id)).ok) return { error: "common.rateLimited" };
  await generateReportSummary(user.id, report.id, normalizeLocale(str(fd, "locale")));
  revalidatePath(`/reports/${report.id}`);
  return { ok: true };
}

export async function addHistoryFromReportAction(fd: FormData): Promise<void> {
  const { user } = await requireUser();
  const report = await ownedReport(user.id, str(fd, "reportId"));
  const type = str(fd, "type") === "medication" ? "medication" : "condition";
  const title = str(fd, "title").trim().slice(0, 200);
  if (report && title) {
    await withUser(user.id, async (tx) => {
      const dup = await tx
        .select({ id: historyEntries.id })
        .from(historyEntries)
        .where(and(eq(historyEntries.profileId, report.profileId), eq(historyEntries.type, type), eq(historyEntries.title, title)))
        .limit(1);
      if (!dup.length) {
        const id = crypto.randomUUID();
        const details = str(fd, "details").trim().slice(0, 1000) || null;
        await tx.insert(historyEntries).values({
          id,
          userId: user.id,
          profileId: report.profileId,
          type,
          title,
          detailsEnc: encryptOptional(user.id, details, aad.historyDetails(id)),
          startDate: report.reportDate,
          active: true,
        });
      }
    });
  }
  revalidatePath(`/reports/${report?.id ?? ""}`);
  revalidatePath("/history");
}
