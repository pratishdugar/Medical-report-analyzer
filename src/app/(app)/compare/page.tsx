import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { CompareChart } from "@/components/compare-chart";
import { Badge, Button, Card, CardTitle, EmptyState, LinkButton, PageHeader, Select, flagTone } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { biomarkerName, fmtDate, fmtNum, fmtValue } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { getBiomarker } from "@/lib/medical/biomarkers";
import { compareReports, type CompareObs } from "@/lib/medical/compare";
import { getReport, listReports } from "@/lib/queries";

export const metadata: Metadata = { title: "Compare" };

const verdictTone = { improved: "ok", worsened: "bad", same: "neutral", only: "info" } as const;

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, all] = await Promise.all([getI18n(), listReports(user.id, active.id)]);
  const reps = all.filter((r) => r.results > 0);
  if (reps.length < 2) {
    return (
      <>
        <PageHeader title={t("compare.title")} subtitle={t("compare.subtitle")} />
        <EmptyState title={t("compare.needTwo")} action={<LinkButton href="/reports/upload">{t("reports.upload")}</LinkButton>} />
      </>
    );
  }
  const label = (r: (typeof reps)[number]) => `${fmtDate(r.reportDate ?? r.createdAt, locale)} — ${r.title || r.labName || t(`reports.categories.${r.category}`)}`;
  const pickId = (v: unknown, fallback: string) => (typeof v === "string" && reps.some((r) => r.id === v) ? v : fallback);
  // reps are newest first: default to comparing the two most recent.
  const aId = pickId(sp.a, reps[1].id);
  const bId = pickId(sp.b, reps[0].id);
  const [ra, rb] = await Promise.all([getReport(user.id, aId), getReport(user.id, bId)]);
  // Unconfirmed values (couldn't be verified against the document) are left out of comparisons.
  const toObs = (rows: NonNullable<typeof ra>["observations"]): CompareObs[] =>
    rows.filter((o) => o.verified).map((o) => ({ code: o.biomarkerCode, name: o.name, valueNum: o.valueNum, valueText: o.valueText, unit: o.unit, refLow: o.refLow, refHigh: o.refHigh, flag: o.flag }));
  // Always compare chronologically: older on the left.
  const dateOf = (r: NonNullable<typeof ra>) => r.report.reportDate ?? r.report.createdAt.toISOString().slice(0, 10);
  const [older, newer] = ra && rb && dateOf(ra) > dateOf(rb) ? [rb, ra] : [ra, rb];
  const rows = older && newer ? compareReports(toObs(older.observations), toObs(newer.observations)) : [];
  const counts = { improved: 0, worsened: 0, same: 0, only: 0 };
  for (const r of rows) counts[r.verdict]++;
  const named = rows.map((r) => ({
    ...r,
    label: biomarkerName(r.code, r.name, locale),
    aText: r.a ? `${fmtValue(r.a)} ${r.a.unit ?? ""}`.trim() : "—",
    bText: r.b ? `${fmtValue(r.b)} ${r.b.unit ?? ""}`.trim() : "—",
  }));
  const chartRows = named.filter((r) => r.a?.valueNum != null && r.b?.valueNum != null && ((r.b.refLow ?? r.a.refLow) !== null || (r.b.refHigh ?? r.a.refHigh) !== null));

  return (
    <>
      <PageHeader title={t("compare.title")} subtitle={t("compare.subtitle")} />
      <Card className="mb-6">
        <form method="get" className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("compare.older")}</span>
            <Select name="a" defaultValue={older?.report.id}>{reps.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}</Select>
          </label>
          <ArrowRight className="hidden self-center text-muted sm:block" aria-hidden />
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("compare.newer")}</span>
            <Select name="b" defaultValue={newer?.report.id}>{reps.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}</Select>
          </label>
          <Button type="submit">{t("compare.cta")}</Button>
        </form>
      </Card>

      {older && newer && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="ok" className="px-3 py-1 text-sm">{t("compare.improved")}: {counts.improved}</Badge>
            <Badge tone="bad" className="px-3 py-1 text-sm">{t("compare.worsened")}: {counts.worsened}</Badge>
            <Badge tone="neutral" className="px-3 py-1 text-sm">{t("compare.same")}: {counts.same}</Badge>
            {counts.only > 0 && <Badge tone="info" className="px-3 py-1 text-sm">{t("compare.onlyIn")}: {counts.only}</Badge>}
          </div>
          {chartRows.length > 0 && (
            <Card className="mb-6">
              <CardTitle>{t("compare.chartTitle")}</CardTitle>
              <p className="-mt-2 mb-3 text-xs text-muted">{t("compare.chartHint")}</p>
              <CompareChart rows={chartRows} labels={{ older: `${t("compare.older")} (${fmtDate(dateOf(older), locale)})`, newer: `${t("compare.newer")} (${fmtDate(dateOf(newer), locale)})`, normal: t("trends.reference") }} />
            </Card>
          )}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">{t("common.test")}</th>
                    <th className="py-2 pr-3">{fmtDate(dateOf(older), locale)}</th>
                    <th className="py-2 pr-3">{fmtDate(dateOf(newer), locale)}</th>
                    <th className="py-2 pr-3">{t("compare.change")}</th>
                    <th className="py-2">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {named.map((r) => {
                    const dec = getBiomarker(r.code)?.decimals ?? 2;
                    return (
                      <tr key={r.key} className="border-t border-border">
                        <td className="py-2 pr-3">{r.label}</td>
                        <td className="py-2 pr-3 tabular">{r.a ? <span className={r.a.flag !== "normal" && r.a.flag !== "unknown" ? "font-semibold" : ""}>{r.aText}</span> : "—"}{r.a && r.a.flag !== "unknown" && r.a.flag !== "normal" && <Badge tone={flagTone(r.a.flag)} className="ml-1">{t(`flags.${r.a.flag}`)}</Badge>}</td>
                        <td className="py-2 pr-3 tabular">{r.b ? <span className={r.b.flag !== "normal" && r.b.flag !== "unknown" ? "font-semibold" : ""}>{r.bText}</span> : "—"}{r.b && r.b.flag !== "unknown" && r.b.flag !== "normal" && <Badge tone={flagTone(r.b.flag)} className="ml-1">{t(`flags.${r.b.flag}`)}</Badge>}</td>
                        <td className="py-2 pr-3 tabular whitespace-nowrap">{r.delta !== null ? `${r.delta > 0 ? "+" : ""}${fmtNum(r.delta, dec)}${r.pct !== null && Number.isFinite(r.pct) ? ` (${r.pct > 0 ? "+" : ""}${Math.round(r.pct)}%)` : ""}` : "—"}</td>
                        <td className="py-2"><Badge tone={verdictTone[r.verdict]}>{r.verdict === "only" ? t("compare.onlyIn") : t(`compare.${r.verdict}`)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
