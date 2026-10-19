import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, LinkButton, PageHeader, cn, flagTone } from "@/components/ui";
import { Sparkline } from "@/components/viz";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { fmtDate, fmtNum } from "@/lib/display";
import { pick } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { CATEGORIES, getBiomarker, type CategoryId } from "@/lib/medical/biomarkers";
import { derivedValues, seriesByCode } from "@/lib/medical/insights";
import { bandFor } from "@/lib/medical/normalize";
import { listObservations } from "@/lib/queries";

export const metadata: Metadata = { title: "Trends" };

export default async function TrendsPage({ searchParams }: PageProps<"/trends">) {
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : "all";
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, obs] = await Promise.all([getI18n(), listObservations(user.id, active.id)]);
  if (!obs.length) {
    return (
      <>
        <PageHeader title={t("trends.title")} subtitle={t("trends.subtitle", { name: active.name })} />
        <EmptyState title={t("trends.empty")} action={<><LinkButton href="/reports/upload">{t("reports.upload")}</LinkButton><LinkButton href="/vitals" variant="secondary">{t("nav.vitals")}</LinkButton></>} />
      </>
    );
  }
  const series = seriesByCode(obs);
  for (const d of derivedValues(obs, active)) if (!series.has(d.code)) series.set(d.code, []);
  const unknown = obs.filter((o) => !o.code);
  const presentCats = CATEGORIES.filter((c) => [...series.keys()].some((code) => getBiomarker(code)?.category === c.id));

  return (
    <>
      <PageHeader title={t("trends.title")} subtitle={t("trends.subtitle", { name: active.name })} actions={<LinkButton href="/vitals" variant="secondary">{t("trends.addReading")}</LinkButton>} />
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Categories">
        {[{ id: "all", label: t("trends.allCategories") }, ...presentCats.map((c) => ({ id: c.id, label: pick(c.label, locale) }))].map((c) => (
          <Link key={c.id} href={c.id === "all" ? "/trends" : `/trends?cat=${c.id}`} aria-current={cat === c.id ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", cat === c.id ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface hover:bg-surface-2")}>
            {c.label}
          </Link>
        ))}
      </nav>
      {presentCats.filter((c) => cat === "all" || c.id === cat).map((c) => {
        const codes = [...series.keys()].filter((code) => getBiomarker(code)?.category === (c.id as CategoryId));
        return (
          <section key={c.id} className="mb-8">
            <h2 className="mb-3 text-base font-semibold">{pick(c.label, locale)}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {codes.map((code) => {
                const b = getBiomarker(code)!;
                const arr = series.get(code)!;
                const last = arr[arr.length - 1];
                const nums = arr.map((o) => o.valueNum).filter((v): v is number => v !== null);
                const band = last?.valueNum != null ? bandFor(b, last.valueNum) : null;
                return (
                  <Link key={code} href={`/trends/${code}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{locale === "hi" ? b.hi : b.name}</p>
                      {last ? (
                        <>
                          <p className="mt-1 text-xl font-semibold">
                            {last.valueNum !== null ? fmtNum(last.valueNum, b.decimals) : last.valueText} <span className="text-sm font-normal text-muted">{b.unit}</span>
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <Badge tone={flagTone(last.flag)}>{band ? pick(band.label, locale) : t(`flags.${last.flag}`)}</Badge>
                            {fmtDate(last.observedAt, locale)} · {t("trends.readings", { count: arr.length })}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-muted">{t("dashboard.kinds.derived")}</p>
                      )}
                    </div>
                    <Sparkline values={nums} low={last?.refLow} high={last?.refHigh} width={96} height={40} label={`${b.name} trend`} />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      {(cat === "all" || cat === "other") && unknown.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold">{t("vitals.other")}</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="p-3">{t("common.test")}</th><th className="p-3">{t("common.value")}</th><th className="p-3">{t("common.date")}</th><th className="p-3">{t("common.status")}</th></tr></thead>
              <tbody>
                {unknown.slice(-50).reverse().map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3">{o.reportId ? <Link className="hover:underline" href={`/reports/${o.reportId}`}>{o.name}</Link> : o.name}</td>
                    <td className="p-3 tabular">{o.valueNum !== null ? fmtNum(o.valueNum) : o.valueText} {o.unit}</td>
                    <td className="p-3">{fmtDate(o.observedAt, locale)}</td>
                    <td className="p-3">{o.flag !== "unknown" && <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
