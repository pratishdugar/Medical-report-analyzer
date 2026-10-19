import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { aad, decryptOptional } from "./crypto";
import { isUuid, withUser } from "./db";
import { auditEvents, historyEntries, observations, reports, shareLinks } from "./db/schema";
import type { ObsLite } from "./medical/insights";

/*
 * Read helpers for pages. Each takes the session user id and runs inside
 * withUser(), so RLS restricts results to that account no matter what ids
 * are passed in from the URL.
 */

export async function listReports(userId: string, profileId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: reports.id,
        title: reports.title,
        category: reports.category,
        labName: reports.labName,
        reportDate: reports.reportDate,
        status: reports.status,
        createdAt: reports.createdAt,
        mimeType: reports.mimeType,
        // Fully qualified outer reference: an unqualified "id" would bind to the inner table.
        results: sql<number>`(select count(*)::int from observations o where o.report_id = "reports"."id")`,
        abnormal: sql<number>`(select count(*)::int from observations o where o.report_id = "reports"."id" and o.flag not in ('normal','unknown'))`,
      })
      .from(reports)
      .where(eq(reports.profileId, profileId))
      .orderBy(desc(sql`coalesce(${reports.reportDate}, ${reports.createdAt}::date)`), desc(reports.createdAt)),
  );
}

export async function getReport(userId: string, reportId: string) {
  if (!isUuid(reportId)) return null;
  return withUser(userId, async (tx) => {
    const [report] = await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!report) return null;
    const rows = await tx.select().from(observations).where(eq(observations.reportId, reportId)).orderBy(asc(observations.createdAt));
    return {
      report,
      observations: rows,
      notes: decryptOptional(userId, report.notesEnc, aad.reportField(report.id, "notes")),
      aiSummary: decryptOptional(userId, report.aiSummaryEnc, aad.reportField(report.id, "ai_summary")),
    };
  });
}

/**
 * Results for charts and insights. Values the user hasn't confirmed and that
 * couldn't be verified against the source document are left out until reviewed.
 */
export async function listObservations(userId: string, profileId: string, opts: { includeUnverified?: boolean } = {}): Promise<(ObsLite & { reportId: string | null; source: string; verified: boolean })[]> {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: observations.id,
        code: observations.biomarkerCode,
        name: observations.name,
        valueNum: observations.valueNum,
        valueText: observations.valueText,
        unit: observations.unit,
        refLow: observations.refLow,
        refHigh: observations.refHigh,
        flag: observations.flag,
        observedAt: observations.observedAt,
        reportId: observations.reportId,
        source: observations.source,
        verified: observations.verified,
      })
      .from(observations)
      .where(opts.includeUnverified ? eq(observations.profileId, profileId) : and(eq(observations.profileId, profileId), eq(observations.verified, true)))
      .orderBy(asc(observations.observedAt), asc(observations.createdAt)),
  );
}

export async function listHistory(userId: string, profileId: string) {
  const rows = await withUser(userId, (tx) =>
    tx
      .select()
      .from(historyEntries)
      .where(eq(historyEntries.profileId, profileId))
      .orderBy(desc(historyEntries.active), desc(historyEntries.startDate), desc(historyEntries.createdAt)),
  );
  return rows.map((r) => ({ ...r, details: decryptOptional(userId, r.detailsEnc, aad.historyDetails(r.id)) }));
}

export async function listShareLinks(userId: string, profileId: string) {
  return withUser(userId, (tx) =>
    tx.select().from(shareLinks).where(eq(shareLinks.profileId, profileId)).orderBy(desc(shareLinks.createdAt)).limit(50),
  );
}

export async function listAudit(userId: string, limit = 30) {
  return withUser(userId, (tx) => tx.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit));
}

export async function reportCount(userId: string, profileId: string) {
  const [row] = await withUser(userId, (tx) =>
    tx.select({ n: count() }).from(reports).where(and(eq(reports.profileId, profileId))),
  );
  return row?.n ?? 0;
}
