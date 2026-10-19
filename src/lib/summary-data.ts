import { and, asc, desc, eq } from "drizzle-orm";
import { aad, decryptOptional } from "./crypto";
import type { Tx } from "./db";
import { historyEntries, observations, profiles, reports } from "./db/schema";
import { latestByCode, seriesByCode, type ObsLite } from "./medical/insights";

export type SummaryData = Awaited<ReturnType<typeof loadSummaryData>>;

/** Everything the doctor summary needs for one profile. Call inside an RLS-scoped transaction. */
export async function loadSummaryData(tx: Tx, userId: string, profileId: string) {
  const [profile] = await tx.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return null;
  const obs: ObsLite[] = await tx
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
    })
    .from(observations)
    .where(and(eq(observations.profileId, profileId), eq(observations.verified, true)))
    .orderBy(asc(observations.observedAt), asc(observations.createdAt));
  const history = (await tx.select().from(historyEntries).where(eq(historyEntries.profileId, profileId)).orderBy(desc(historyEntries.active), desc(historyEntries.startDate)))
    .map((h) => ({ ...h, details: decryptOptional(userId, h.detailsEnc, aad.historyDetails(h.id)) }));
  const reportList = await tx
    .select({ id: reports.id, title: reports.title, labName: reports.labName, reportDate: reports.reportDate, category: reports.category, createdAt: reports.createdAt, fileKey: reports.fileKey })
    .from(reports)
    .where(eq(reports.profileId, profileId))
    .orderBy(desc(reports.reportDate), desc(reports.createdAt));
  const latest = [...latestByCode(obs).values()];
  const trends = [...seriesByCode(obs).entries()]
    .filter(([, arr]) => arr.filter((o) => o.valueNum !== null).length >= 2)
    .map(([code, arr]) => {
      const nums = arr.filter((o) => o.valueNum !== null);
      return { code, first: nums[0], last: nums[nums.length - 1], count: nums.length };
    });
  return { profile, latest, trends, history, reports: reportList };
}
