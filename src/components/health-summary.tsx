import { Badge, flagTone } from "./ui";
import { biomarkerName, fmtDate, fmtNum, fmtRange } from "@/lib/display";
import type { Locale, TFunction } from "@/lib/i18n";
import { CATEGORIES, getBiomarker } from "@/lib/medical/biomarkers";
import { ageOn, isAbnormal } from "@/lib/medical/normalize";
import type { SummaryData } from "@/lib/summary-data";

type HistoryItem = NonNullable<SummaryData>["history"][number];

function HistoryList({ items, t, locale }: { items: HistoryItem[]; t: TFunction; locale: Locale }) {
  if (!items.length) return <p className="text-sm text-muted">{t("common.none")}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((h) => (
        <li key={h.id}>
          <span className="font-medium">{h.title}</span>
          {!h.active && <span className="text-muted"> ({t("history.past")})</span>}
          {h.startDate && <span className="text-muted"> · {fmtDate(h.startDate, locale)}</span>}
          {h.details && <span className="text-muted"> — {h.details}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Printable one-page health summary, used for the owner's print view and doctor share links. */
export function HealthSummary({ data, t, locale, fileHref }: { data: NonNullable<SummaryData>; t: TFunction; locale: Locale; fileHref?: (reportId: string) => string }) {
  const { profile, latest, trends, history, reports } = data;
  const age = ageOn(profile.dateOfBirth);
  const abnormal = latest.filter((o) => isAbnormal(o.flag));
  const byCat = (code: string | null) => CATEGORIES.findIndex((c) => c.id === getBiomarker(code)?.category);
  const sorted = [...latest].sort((a, b) => byCat(a.code) - byCat(b.code));
  const historyOf = (types: string[]) => history.filter((h) => types.includes(h.type));
  const section = "mb-6 break-inside-avoid";
  const h2 = "mb-2 border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted";

  return (
    <div className="text-fg">
      <div className={section}>
        <h2 className={h2}>{t("summary.patient")}</h2>
        <p className="text-lg font-semibold">{profile.name}</p>
        <p className="text-sm text-muted">
          {[age !== null ? `${age} ${locale === "hi" ? "वर्ष" : "years"}` : null, profile.sex ? t(`family.sexes.${profile.sex}`) : null, profile.bloodGroup, profile.heightCm ? `${profile.heightCm} cm` : null, profile.diet ? t(`family.diets.${profile.diet}`) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="grid gap-x-8 sm:grid-cols-3">
        <div className={section}><h2 className={h2}>{t("summary.conditions")}</h2><HistoryList t={t} locale={locale} items={historyOf(["condition"])} /></div>
        <div className={section}><h2 className={h2}>{t("summary.medications")}</h2><HistoryList t={t} locale={locale} items={historyOf(["medication"]).filter((h) => h.active)} /></div>
        <div className={section}><h2 className={h2}>{t("summary.allergies")}</h2><HistoryList t={t} locale={locale} items={historyOf(["allergy"])} /></div>
      </div>

      {abnormal.length > 0 && (
        <div className={section}>
          <h2 className={h2}>{t("summary.abnormal")}</h2>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {abnormal.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span>{biomarkerName(o.code, o.name, locale)}</span>
                <span className="tabular">
                  <b>{o.valueNum !== null ? fmtNum(o.valueNum, getBiomarker(o.code)?.decimals ?? 2) : o.valueText}</b> {o.unit} · {fmtDate(o.observedAt, locale)} <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {trends.length > 0 && (
        <div className={section}>
          <h2 className={h2}>{t("summary.trendsTitle")}</h2>
          <table className="w-full text-sm">
            <tbody>
              {trends.map((tr) => {
                const dec = getBiomarker(tr.code)?.decimals ?? 2;
                return (
                  <tr key={tr.code} className="border-t border-border">
                    <td className="py-1 pr-2">{biomarkerName(tr.code, tr.last.name, locale)}</td>
                    <td className="py-1 pr-2 tabular text-muted">{fmtNum(tr.first.valueNum, dec)} ({fmtDate(tr.first.observedAt, locale)})</td>
                    <td className="py-1 pr-2">→</td>
                    <td className="py-1 pr-2 tabular font-medium">{fmtNum(tr.last.valueNum, dec)} {tr.last.unit} ({fmtDate(tr.last.observedAt, locale)})</td>
                    <td className="py-1 text-xs text-muted">{tr.count}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={section}>
        <h2 className={h2}>{t("summary.latest")}</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="py-1 pr-2">{t("common.test")}</th><th className="py-1 pr-2">{t("common.value")}</th><th className="py-1 pr-2">{t("common.range")}</th><th className="py-1 pr-2">{t("common.date")}</th><th /></tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="py-1 pr-2">{biomarkerName(o.code, o.name, locale)}</td>
                <td className="py-1 pr-2 tabular font-medium">{o.valueNum !== null ? fmtNum(o.valueNum, getBiomarker(o.code)?.decimals ?? 2) : o.valueText} <span className="font-normal text-muted">{o.unit}</span></td>
                <td className="py-1 pr-2 tabular text-muted">{fmtRange(o.refLow, o.refHigh)}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(o.observedAt, locale)}</td>
                <td className="py-1">{o.flag !== "unknown" && <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-x-8 sm:grid-cols-2">
        <div className={section}><h2 className={h2}>{t("summary.otherHistory")}</h2><HistoryList t={t} locale={locale} items={historyOf(["surgery", "vaccination", "family_history", "other"])} /></div>
        <div className={section}>
          <h2 className={h2}>{t("summary.reports")}</h2>
          <ul className="space-y-1 text-sm">
            {reports.map((r) => (
              <li key={r.id}>
                {fmtDate(r.reportDate ?? r.createdAt, locale)} — {r.title || r.labName || t(`reports.categories.${r.category}`)}
                {fileHref && r.fileKey && (
                  <> · <a href={fileHref(r.id)} target="_blank" rel="noopener noreferrer" className="text-primary underline no-print">{t("common.view")}</a></>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">{t("disclaimer.short")}</p>
    </div>
  );
}
