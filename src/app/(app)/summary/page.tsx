import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HealthSummary } from "@/components/health-summary";
import { PrintButton } from "@/components/print-button";
import { Card, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { withUser } from "@/lib/db";
import { fmtDate } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { loadSummaryData } from "@/lib/summary-data";

export const metadata: Metadata = { title: "Doctor summary" };

export default async function SummaryPage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, data] = await Promise.all([getI18n(), withUser(user.id, (tx) => loadSummaryData(tx, user.id, active.id))]);
  if (!data) notFound();
  return (
    <>
      <PageHeader title={t("summary.title")} subtitle={t("summary.generated", { date: fmtDate(new Date(), locale) })} actions={<PrintButton />} />
      <Card className="print-plain"><HealthSummary data={data} t={t} locale={locale} fileHref={(id) => `/api/files/${id}`} /></Card>
    </>
  );
}
