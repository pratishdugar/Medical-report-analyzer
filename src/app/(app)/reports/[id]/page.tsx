import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { addHistoryFromReportAction, confirmObservationAction, deleteReportAction, reprocessReportAction } from "@/actions/reports";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DeleteObservation, ObservationEditor, ReportDetailsForm, ReportPoller, SummaryButton } from "@/components/report-client";
import { Alert, Badge, Button, Card, CardTitle, PageHeader, flagTone } from "@/components/ui";
import { RangeMeter } from "@/components/viz";
import { requireUser } from "@/lib/dal";
import { biomarkerName, fmtDate, fmtRange, fmtValue } from "@/lib/display";
import { pick } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { BIOMARKER_LIST, CATEGORIES, getBiomarker } from "@/lib/medical/biomarkers";
import { decodeExtras } from "@/lib/reports/process";
import { getReport, listHistory } from "@/lib/queries";

export const metadata: Metadata = { title: "Report" };

const statusTone = { processing: "info", ready: "ok", needs_review: "warn", failed: "bad" } as const;

function rangeInput(low: number | null, high: number | null, text: string | null) {
  if (low !== null && high !== null) return `${low} - ${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return text ?? "";
}

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { user } = await requireUser();
  const data = await getReport(user.id, id);
  if (!data) notFound();
  const { report, observations: rows, notes, aiSummary } = data;
  const [{ t, locale }, history] = await Promise.all([getI18n(), listHistory(user.id, report.profileId)]);
  const extras = decodeExtras(user.id, report.id, report.extrasEnc);
  const processing = report.status === "processing";
  const title = report.title || report.labName || t(`reports.categories.${report.category}`);
  const catalog = BIOMARKER_LIST.map((b) => ({ code: b.code, name: locale === "hi" ? `${b.hi} (${b.name})` : b.name })).sort((a, b) => a.name.localeCompare(b.name));
  const existingHistory = new Set(history.map((h) => `${h.type}:${h.title.toLowerCase()}`));

  // Group rows by catalog category; unknown tests last.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const cat = getBiomarker(r.biomarkerCode)?.category ?? "other";
    groups.set(cat, [...(groups.get(cat) ?? []), r]);
  }
  const orderedGroups = [...CATEGORIES.map((c) => c.id as string), "other"].filter((c) => groups.has(c));
  const method = report.extractionMethod?.startsWith("llm:")
    ? t("reports.detail.methodLlm", { provider: report.extractionMethod.slice(4).split("/")[0] })
    : report.extractionMethod === "rules"
      ? t("reports.detail.methodRules")
      : null;
  const [summaryLang, summarySource] = (report.aiSummaryLang ?? "").split(":");

  return (
    <>
      <ReportPoller id={report.id} status={report.status} />
      <PageHeader
        title={title}
        subtitle={[fmtDate(report.reportDate ?? report.createdAt, locale), report.labName && report.title ? report.labName : null].filter(Boolean).join(" · ")}
        actions={
          <>
            {report.fileKey && (
              <a href={`/api/files/${report.id}`} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
                <ExternalLink size={16} aria-hidden /> {t("reports.detail.openOriginal")}
              </a>
            )}
            <form action={reprocessReportAction}>
              <input type="hidden" name="id" value={report.id} />
              <Button variant="secondary" disabled={processing}><RefreshCw size={16} aria-hidden /> {t("reports.detail.reprocess")}</Button>
            </form>
            <form action={deleteReportAction}>
              <input type="hidden" name="id" value={report.id} />
              <ConfirmSubmit variant="ghost" message={t("reports.detail.deleteConfirm")} className="text-bad"><Trash2 size={16} aria-hidden /> {t("common.delete")}</ConfirmSubmit>
            </form>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={statusTone[report.status as keyof typeof statusTone] ?? "neutral"}>{t(`reports.statuses.${report.status}`)}</Badge>
        {method && <span className="text-muted">{t("reports.detail.method")}: {method}</span>}
      </div>

      {sp.error === "rate" && <Alert tone="bad" className="mb-4">{t("common.rateLimited")}</Alert>}
      {processing && <Alert tone="info" className="mb-4">{t("reports.detail.processing")}</Alert>}
      {report.status === "failed" && <Alert tone="bad" className="mb-4">{t("reports.detail.failed")}</Alert>}
      {extras?.warnings.length ? (
        <div className="mb-4 space-y-2">
          {extras.warnings.map((w) => (
            <Alert key={w} tone={w === "sex_mismatch" || w === "ocr_suspect_values" ? "bad" : "warn"}>{t(`reports.detail.warnings.${w}`)}</Alert>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>{t("reports.detail.results")}</CardTitle>
            {rows.length === 0 && !processing && <p className="mb-3 text-sm text-muted">{t("reports.detail.noResults")}</p>}
            {rows.length > 0 && <p className="mb-3 text-xs text-muted">{t("reports.detail.editHint")}</p>}
            {rows.some((o) => !o.verified) && (
              <form action={confirmObservationAction} className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-warn-soft p-3 text-sm">
                <input type="hidden" name="reportId" value={report.id} />
                <span className="flex-1">{t("reports.detail.unverifiedNote")}</span>
                <Button variant="secondary" className="min-h-0 px-3 py-1.5"><Check size={14} aria-hidden /> {t("reports.detail.confirmAll")}</Button>
              </form>
            )}
            {orderedGroups.map((cat) => (
              <section key={cat} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {cat === "other" ? t("history.types.other") : pick(CATEGORIES.find((c) => c.id === cat)!.label, locale)}
                </h3>
                <ul className="divide-y divide-border">
                  {groups.get(cat)!.map((o) => {
                    const name = biomarkerName(o.biomarkerCode, o.name, locale);
                    const unit = o.unit ?? "";
                    return (
                      <li key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[minmax(8rem,1fr)_8.5rem_6rem_7rem_auto]">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {o.biomarkerCode ? <Link href={`/trends/${o.biomarkerCode}`} className="hover:underline">{name}</Link> : name}
                          </p>
                          {o.biomarkerCode && name !== o.name && <p className="truncate text-xs text-muted">{o.name}</p>}
                        </div>
                        <div className="text-right tabular sm:text-left">
                          <span className="font-semibold">{fmtValue(o)}</span> <span className="text-xs text-muted">{unit}</span>
                          <div className="hidden sm:block">
                            <RangeMeter value={o.valueNum} low={o.refLow} high={o.refHigh} flag={o.flag} width={120} label={`${name}: ${t(`flags.${o.flag}`)}`} />
                          </div>
                        </div>
                        <div className="text-xs text-muted tabular">{fmtRange(o.refLow, o.refHigh, o.refText)}</div>
                        <div className="flex flex-wrap items-center justify-end gap-1 sm:justify-start">
                          {o.flag !== "unknown" && <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>}
                          {!o.verified && <Badge tone="warn" title={t("reports.detail.verifyHint")}>{t("reports.detail.verifyBadge")}</Badge>}
                        </div>
                        <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                          {!o.verified && (
                            <form action={confirmObservationAction}>
                              <input type="hidden" name="id" value={o.id} />
                              <input type="hidden" name="reportId" value={report.id} />
                              <button className="rounded p-1.5 text-ok hover:bg-ok-soft" aria-label={`${t("reports.detail.confirmValue")}: ${name}`} title={t("reports.detail.confirmValue")}>
                                <Check size={16} />
                              </button>
                            </form>
                          )}
                          <ObservationEditor
                            reportId={report.id}
                            catalog={catalog}
                            obs={{ id: o.id, name: o.name, code: o.biomarkerCode, value: o.valueNum !== null ? String(o.valueNum) : (o.valueText ?? ""), unit: o.unit, range: rangeInput(o.refLow, o.refHigh, o.refText) }}
                          />
                          <DeleteObservation id={o.id} back={`/reports/${report.id}`} label={name} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!processing && <div className="mt-4"><ObservationEditor reportId={report.id} catalog={catalog} /></div>}
          </Card>

          {!processing && (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="mb-0">{t("reports.detail.aiSummary")}</CardTitle>
                {rows.length > 0 && <SummaryButton id={report.id} hasSummary={!!aiSummary} />}
              </div>
              {aiSummary ? (
                <>
                  <div className="whitespace-pre-line text-sm leading-relaxed" lang={summaryLang === "hi" ? "hi" : "en"}>{aiSummary}</div>
                  <p className="mt-3 text-xs text-muted">{summarySource === "ai" ? t("reports.detail.aiNote") : t("reports.detail.aiNoProvider")}</p>
                </>
              ) : (
                <p className="text-sm text-muted">{rows.length ? t("reports.detail.aiNote") : t("reports.detail.noResults")}</p>
              )}
            </Card>
          )}

          {extras && (extras.summary || extras.medications.length > 0 || extras.diagnoses.length > 0) && (
            <Card>
              <CardTitle>{t("reports.detail.suggested")}</CardTitle>
              {extras.summary && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("reports.detail.docSummary")}</p>
                  <p className="mt-1 text-sm">{extras.summary}</p>
                </div>
              )}
              {(extras.medications.length > 0 || extras.diagnoses.length > 0) && <p className="mb-2 text-sm text-muted">{t("reports.detail.suggestedHint")}</p>}
              {[
                ...extras.diagnoses.map((d) => ({ type: "condition", title: d, details: "" })),
                ...extras.medications.map((m) => ({ type: "medication", title: [m.name, m.dose].filter(Boolean).join(" "), details: [m.frequency, m.duration].filter(Boolean).join(", ") })),
              ].map((item) => {
                const added = existingHistory.has(`${item.type}:${item.title.toLowerCase()}`);
                return (
                  <form key={`${item.type}:${item.title}`} action={addHistoryFromReportAction} className="flex items-center justify-between gap-2 border-t border-border py-2 text-sm first-of-type:border-t-0">
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="type" value={item.type} />
                    <input type="hidden" name="title" value={item.title} />
                    <input type="hidden" name="details" value={item.details} />
                    <span>
                      <Badge tone="primary">{t(`history.types.${item.type}`)}</Badge> <span className="ml-1">{item.title}</span>
                      {item.details && <span className="text-muted"> · {item.details}</span>}
                    </span>
                    {added ? <Badge tone="ok">{t("reports.detail.added")}</Badge> : <Button variant="secondary" className="min-h-0 px-3 py-1.5">{t("reports.detail.addToHistory")}</Button>}
                  </form>
                );
              })}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {report.fileKey && report.mimeType?.startsWith("image/") && (
            <Card>
              <CardTitle>{t("reports.detail.original")}</CardTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${report.id}`} alt={t("reports.detail.original")} className="w-full rounded-lg border border-border" />
            </Card>
          )}
          <Card>
            <CardTitle>{t("reports.detail.details")}</CardTitle>
            <ReportDetailsForm report={{ id: report.id, title: report.title, labName: report.labName, reportDate: report.reportDate, category: report.category, notes }} />
          </Card>
        </div>
      </div>
    </>
  );
}
