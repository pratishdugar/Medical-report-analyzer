import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddReadingForm } from "@/components/add-reading-form";
import { DeleteObservation } from "@/components/report-client";
import { TrendChart } from "@/components/trend-chart";
import { Badge, Card, CardTitle, PageHeader, flagTone } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { fmtDate, fmtNum, fmtRange } from "@/lib/display";
import { pick } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { adviceFor } from "@/lib/medical/advice";
import { getBiomarker } from "@/lib/medical/biomarkers";
import { derivedSeries } from "@/lib/medical/insights";
import { ageOn, bandFor, defaultRange, isAbnormal } from "@/lib/medical/normalize";
import { listObservations } from "@/lib/queries";

export const metadata: Metadata = { title: "Trend" };

export default async function TrendDetailPage({ params }: PageProps<"/trends/[code]">) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).toUpperCase();
  const b = getBiomarker(code);
  if (!b) notFound();
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, obs] = await Promise.all([getI18n(), listObservations(user.id, active.id)]);
  let rows = obs.filter((o) => o.code === code).map((o) => ({ ...o, calc: false }));
  if (!rows.length) rows = derivedSeries(code, obs, active).map((o) => ({ ...o, reportId: null, source: "calc", verified: true, calc: true }));
  const numeric = rows.filter((o) => o.valueNum !== null);
  const last = rows[rows.length - 1];
  const sex = active.sex === "male" || active.sex === "female" ? active.sex : null;
  const fallback = defaultRange(b, sex, ageOn(active.dateOfBirth));
  const low = last?.refLow ?? fallback?.low ?? null;
  const high = last?.refHigh ?? fallback?.high ?? null;
  const band = last?.valueNum != null ? bandFor(b, last.valueNum) : null;
  const advice = last && isAbnormal(last.flag) ? adviceFor(code, last.flag) : null;
  const name = locale === "hi" ? b.hi : b.name;

  return (
    <>
      <PageHeader title={name} subtitle={pick(b.info, locale)} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            {last ? (
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm text-muted">{t("trends.latest")}</span>
                <span className="text-3xl font-semibold">{last.valueNum !== null ? fmtNum(last.valueNum, b.decimals) : last.valueText}</span>
                <span className="text-muted">{b.unit}</span>
                <Badge tone={flagTone(last.flag)}>{band ? pick(band.label, locale) : t(`flags.${last.flag}`)}</Badge>
                <span className="text-sm text-muted">{fmtDate(last.observedAt, locale)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("trends.empty")}</p>
            )}
            {numeric.length > 0 && (
              <TrendChart
                name={name}
                unit={b.unit}
                decimals={b.decimals}
                low={low}
                high={high}
                points={numeric.map((o) => ({ t: new Date(`${o.observedAt}T00:00:00Z`).getTime(), date: o.observedAt, value: o.valueNum!, flag: o.flag, source: o.source }))}
              />
            )}
          </Card>

          {rows.length > 0 && (
            <Card>
              <CardTitle>{t("trends.history")}</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr><th className="py-2 pr-3">{t("common.date")}</th><th className="py-2 pr-3">{t("common.value")}</th><th className="py-2 pr-3">{t("common.range")}</th><th className="py-2 pr-3">{t("common.status")}</th><th className="py-2 pr-3">{t("trends.source")}</th><th /></tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(o.observedAt, locale)}</td>
                        <td className="py-2 pr-3 tabular font-medium">{o.valueNum !== null ? fmtNum(o.valueNum, b.decimals) : o.valueText} <span className="text-xs font-normal text-muted">{o.unit ?? b.unit}</span></td>
                        <td className="py-2 pr-3 tabular text-muted">{fmtRange(o.refLow, o.refHigh)}</td>
                        <td className="py-2 pr-3">{o.flag !== "unknown" && <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>}</td>
                        <td className="py-2 pr-3">
                          {o.reportId ? <Link href={`/reports/${o.reportId}`} className="text-primary hover:underline">{t("trends.fromReport")}</Link> : o.calc ? t("dashboard.kinds.derived") : t("trends.manual")}
                        </td>
                        <td className="py-2 text-right">{!o.reportId && !o.calc && <DeleteObservation id={o.id} back={`/trends/${code}`} label={`${name} ${fmtDate(o.observedAt, locale)}`} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {advice && (
            <Card>
              <CardTitle>{pick(advice.title, locale)}</CardTitle>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">{advice.tips.map((tip, i) => <li key={i}>{pick(tip, locale)}</li>)}</ul>
              <p className="mt-3 text-sm font-medium">{pick(advice.action, locale)}</p>
            </Card>
          )}
          <Card>
            <CardTitle>{t("trends.about")}</CardTitle>
            <p className="text-sm">{pick(b.info, locale)}</p>
            {(low !== null || high !== null) && <p className="mt-2 text-sm text-muted">{t("trends.reference")}: {fmtRange(low, high)} {b.unit}</p>}
            {b.bands && (
              <ul className="mt-3 space-y-1 text-sm">
                {b.bands.map((bd, i) => {
                  const prev = i > 0 ? b.bands![i - 1].below : undefined;
                  const span = prev === undefined ? `< ${fmtNum(bd.below!)}` : bd.below === undefined ? `≥ ${fmtNum(prev)}` : `${fmtNum(prev)} – ${fmtNum(bd.below)}`;
                  return (
                    <li key={i} className="flex justify-between gap-2">
                      <Badge tone={bd.level === "ok" ? "ok" : bd.level === "watch" ? "warn" : "bad"}>{pick(bd.label, locale)}</Badge>
                      <span className="tabular text-muted">{span}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          {code !== "EGFR" && code !== "BMI" && (
            <Card>
              <CardTitle>{t("trends.addReading")}</CardTitle>
              <AddReadingForm profileId={active.id} code={code} unit={b.unit} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
