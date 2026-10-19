import { eq } from "drizzle-orm";
import { aad, encryptText } from "../crypto";
import { getDb, withUser } from "../db";
import { observations, profiles, reports, users } from "../db/schema";
import { chatJSON, configuredProviders } from "../extraction/llm";
import { SUMMARY_SYSTEM_PROMPT } from "../extraction/prompt";
import { pick, type Locale } from "../i18n";
import { getBiomarker } from "../medical/biomarkers";
import { computeInsights } from "../medical/insights";
import { ageOn, isAbnormal } from "../medical/normalize";

type Row = typeof observations.$inferSelect;

function describe(o: Row): string {
  const b = getBiomarker(o.biomarkerCode);
  const name = b?.name ?? o.name;
  const value = o.valueNum !== null ? `${o.valueNum} ${o.unit ?? ""}`.trim() : (o.valueText ?? "");
  const range = o.refLow !== null || o.refHigh !== null ? ` (normal ${o.refLow ?? ""}–${o.refHigh ?? ""})` : "";
  return `- ${name}: ${value}${range} [${o.flag}]`;
}

/** Deterministic explanation used when no AI provider is available or allowed. */
export function builtinSummary(rows: Row[], profile: { dateOfBirth: string | null; sex: string | null; heightCm: number | null; diet: string | null }, locale: Locale): string {
  const total = rows.length;
  const abnormal = rows.filter((r) => isAbnormal(r.flag));
  const lite = rows.map((r) => ({ ...r, code: r.biomarkerCode }));
  const insights = computeInsights(lite, profile).filter((i) => i.kind === "alert" || i.kind === "pattern" || i.kind === "derived");
  const lines: string[] = [];
  if (locale === "hi") {
    lines.push(`इस रिपोर्ट में ${total} जाँचें हैं, जिनमें से ${abnormal.length} सामान्य सीमा से बाहर हैं।`);
  } else {
    lines.push(`This report has ${total} results, of which ${abnormal.length} ${abnormal.length === 1 ? "is" : "are"} outside the reference range.`);
  }
  for (const i of insights.slice(0, 8)) {
    lines.push(`• ${pick(i.title, locale)} — ${pick(i.body, locale)}`);
    if (i.tips?.[0]) lines.push(`  ${pick(i.tips[0], locale)}`);
  }
  if (!abnormal.length) {
    lines.push(locale === "hi" ? "सभी परिणाम सामान्य सीमा में हैं। नियमित जाँच जारी रखें।" : "All results are within the reference range. Keep up regular check-ups.");
  }
  lines.push(locale === "hi" ? "इन परिणामों पर अपने डॉक्टर से चर्चा करें।" : "Please discuss these results with your doctor.");
  return lines.join("\n");
}

export async function generateReportSummary(userId: string, reportId: string, locale: Locale): Promise<{ text: string; source: "ai" | "builtin" }> {
  const ctx = await withUser(userId, async (tx) => {
    const [r] = await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!r) return null;
    const [p] = await tx.select().from(profiles).where(eq(profiles.id, r.profileId)).limit(1);
    const rows = await tx.select().from(observations).where(eq(observations.reportId, reportId));
    return { r, p, rows };
  });
  if (!ctx?.p) throw new Error("not found");
  const { r, p, rows } = ctx;
  const [u] = await getDb().select({ aiConsent: users.aiConsent }).from(users).where(eq(users.id, userId)).limit(1);
  const providers = configuredProviders().filter((pr) => pr.trusted || u?.aiConsent);

  let text: string | null = null;
  let source: "ai" | "builtin" = "builtin";
  if (rows.length && providers.length) {
    // Only de-identified structured values are sent: no name, no IDs, no raw report text.
    const age = ageOn(p.dateOfBirth, r.reportDate ?? new Date());
    const content = [
      `Patient: ${age !== null ? `${age} years` : "age unknown"}, ${p.sex ?? "sex unknown"}${p.diet ? `, ${p.diet} diet` : ""}.`,
      `Write the explanation in ${locale === "hi" ? "simple Hindi (Devanagari script)" : "simple English"}.`,
      "Results:",
      ...rows.slice(0, 120).map(describe),
    ].join("\n");
    for (const provider of providers) {
      try {
        const out = (await chatJSON(provider, [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content },
        ], { maxTokens: 1200 })) as { summary?: unknown };
        if (typeof out.summary === "string" && out.summary.trim()) {
          text = out.summary.trim().slice(0, 4000);
          source = "ai";
          break;
        }
      } catch (err) {
        console.warn(`[summary] ${provider.id} failed: ${(err as Error).message}`);
      }
    }
  }
  text ??= builtinSummary(rows, p, locale);
  await withUser(userId, (tx) =>
    tx
      .update(reports)
      .set({ aiSummaryEnc: encryptText(userId, text!, aad.reportField(reportId, "ai_summary")), aiSummaryLang: `${locale}:${source}`, updatedAt: new Date() })
      .where(eq(reports.id, reportId)),
  );
  return { text, source };
}
