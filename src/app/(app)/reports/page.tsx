import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Image as ImageIcon, Upload } from "lucide-react";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { fmtDate } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { listReports } from "@/lib/queries";

export const metadata: Metadata = { title: "Reports" };

const statusTone = { processing: "info", ready: "ok", needs_review: "warn", failed: "bad" } as const;

export default async function ReportsPage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, reps] = await Promise.all([getI18n(), listReports(user.id, active.id)]);
  return (
    <>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle", { name: active.name })}
        actions={<LinkButton href="/reports/upload"><Upload size={16} aria-hidden /> {t("reports.upload")}</LinkButton>}
      />
      {reps.length === 0 ? (
        <EmptyState title={t("reports.empty")} body={t("dashboard.emptyBody")} action={<LinkButton href="/reports/upload">{t("dashboard.emptyCta")}</LinkButton>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {reps.map((r) => (
            <li key={r.id}>
              <Link href={`/reports/${r.id}`} className="flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  {r.mimeType?.startsWith("image/") ? <ImageIcon size={20} aria-hidden /> : <FileText size={20} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium">{r.title || r.labName || t(`reports.categories.${r.category}`)}</span>
                    <Badge tone={statusTone[r.status as keyof typeof statusTone] ?? "neutral"}>{t(`reports.statuses.${r.status}`)}</Badge>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {fmtDate(r.reportDate ?? r.createdAt, locale)}
                    {r.labName && r.title ? ` · ${r.labName}` : ""}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="text-muted">{t("reports.results", { count: r.results })}</span>
                    {r.abnormal > 0 && <Badge tone="bad">{r.abnormal} {t("flags.abnormal").toLowerCase()}</Badge>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
