import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Upload } from "lucide-react";
import { InsightList } from "@/components/insight-list";
import { Badge, Card, CardTitle, EmptyState, LinkButton, PageHeader, flagTone } from "@/components/ui";
import { Sparkline } from "@/components/viz";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { biomarkerName, fmtDate, fmtNum } from "@/lib/display";
import { pick } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getBiomarker, KEY_MARKERS } from "@/lib/medical/biomarkers";
import { computeInsights, derivedValues, latestByCode, seriesByCode } from "@/lib/medical/insights";
import { ageOn, bandFor, isAbnormal } from "@/lib/medical/normalize";
import { listObservations, listReports } from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, obs, reps] = await Promise.all([getI18n(), listObservations(user.id, active.id), listReports(user.id, active.id)]);
  const age = ageOn(active.dateOfBirth);
  const header = (
    <PageHeader
      title={t("dashboard.hello", { name: active.name })}
      subtitle={[age !== null ? `${age} ${locale === "hi" ? "वर्ष" : "yrs"}` : null, active.sex ? t(`family.sexes.${active.sex}`) : null, t("dashboard.title")].filter(Boolean).join(" · ")}
      actions={
        <>
          <LinkButton href="/reports/upload"><Upload size={16} aria-hidden /> {t("nav.upload")}</LinkButton>
          <LinkButton href="/vitals" variant="secondary"><Activity size={16} aria-hidden /> {t("nav.vitals")}</LinkButton>
        </>
      }
    />
  );

  if (!obs.length && !reps.length) {
    return (
      <>
        {header}
        <EmptyState
          title={t("dashboard.emptyTitle")}
          body={t("dashboard.emptyBody")}
          action={
            <>
              <LinkButton href="/reports/upload">{t("dashboard.emptyCta")}</LinkButton>
              <LinkButton href="/vitals" variant="secondary">{t("dashboard.logCta")}</LinkButton>
            </>
          }
        />
      </>
    );
  }

  const insights = computeInsights(obs, active);
  const attention = insights.filter((i) => i.kind === "alert" || i.kind === "pattern" || (i.kind === "derived" && i.severity !== "positive"));
  const progress = insights.filter((i) => i.kind === "trend" || (i.kind === "derived" && i.severity === "positive"));
  const upcoming = insights.filter((i) => i.kind === "reminder" || i.kind === "screening");
  const latest = latestByCode(obs);
  const series = seriesByCode(obs);
  const derived = derivedValues(obs, active);
  const abnormalLatest = [...latest.values()].filter((o) => isAbnormal(o.flag));
  const lastReport = reps.find((r) => r.reportDate) ?? reps[0];

  const tiles = KEY_MARKERS.flatMap((code) => {
    const o = latest.get(code);
    const d = derived.find((x) => x.code === code);
    const b = getBiomarker(code)!;
    if (o && o.valueNum !== null) return [{ code, value: o.valueNum, flag: o.flag, date: o.observedAt, low: o.refLow, high: o.refHigh, b, calc: false }];
    if (d) return [{ code, value: d.value, flag: d.flag, date: d.observedAt, low: null, high: null, b, calc: true }];
    return [];
  });

  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">{t("dashboard.stats.reports")}</p>
          <p className="mt-1 text-3xl font-semibold">{reps.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t("dashboard.stats.abnormal")}</p>
          <p className={`mt-1 text-3xl font-semibold ${abnormalLatest.length ? "text-bad" : "text-ok"}`}>{abnormalLatest.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t("dashboard.stats.lastReport")}</p>
          <p className="mt-1 text-xl font-semibold">{lastReport ? fmtDate(lastReport.reportDate ?? lastReport.createdAt, locale) : "—"}</p>
        </Card>
      </div>

      {tiles.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">{t("dashboard.keyMarkers")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {tiles.map((tile) => {
              const band = bandFor(tile.b, tile.value);
              const vals = (series.get(tile.code) ?? []).map((o) => o.valueNum).filter((v): v is number => v !== null);
              return (
                <Link key={tile.code} href={`/trends/${tile.code}`} className="rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:border-primary">
                  <p className="truncate text-sm text-muted">{locale === "hi" ? tile.b.hi : tile.b.name}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {fmtNum(tile.value, tile.b.decimals)} <span className="text-sm font-normal text-muted">{tile.b.unit}</span>
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <Badge tone={flagTone(tile.flag)}>{band ? pick(band.label, locale) : t(`flags.${tile.flag}`)}</Badge>
                    <Sparkline values={vals} low={tile.low} high={tile.high} width={72} height={28} label={`${tile.b.name} trend`} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{fmtDate(tile.date, locale)}{tile.calc ? " · calc." : ""}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="space-y-6 lg:col-span-3">
          <h2 className="text-base font-semibold">{t("dashboard.insights")}</h2>
          {!insights.length && <p className="text-sm text-muted">{t("dashboard.insightsEmpty")}</p>}
          {attention.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("dashboard.attention")}</h3>
              <InsightList insights={attention} locale={locale} t={t} limit={8} />
            </div>
          )}
          {progress.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("dashboard.progress")}</h3>
              <InsightList insights={progress} locale={locale} t={t} limit={8} />
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("dashboard.upcoming")}</h3>
              <InsightList insights={upcoming} locale={locale} t={t} limit={6} />
            </div>
          )}
        </section>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>{t("dashboard.attention")}</CardTitle>
            {abnormalLatest.length ? (
              <ul className="divide-y divide-border">
                {abnormalLatest.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link href={o.code ? `/trends/${o.code}` : "/trends"} className="min-w-0 truncate hover:underline">{biomarkerName(o.code, o.name, locale)}</Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-medium">{o.valueNum !== null ? fmtNum(o.valueNum, getBiomarker(o.code)?.decimals ?? 2) : o.valueText}</span>
                      <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("dashboard.attentionNone")}</p>
            )}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="mb-0">{t("dashboard.recent")}</CardTitle>
              <Link href="/reports" className="text-sm text-primary hover:underline">{t("dashboard.viewAll")}</Link>
            </div>
            {reps.length ? (
              <ul className="divide-y divide-border">
                {reps.slice(0, 5).map((r) => (
                  <li key={r.id} className="py-2 text-sm">
                    <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span className="min-w-0 truncate">{r.title || r.labName || t(`reports.categories.${r.category}`)}</span>
                      <span className="shrink-0 text-xs text-muted">{fmtDate(r.reportDate ?? r.createdAt, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("reports.empty")}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
