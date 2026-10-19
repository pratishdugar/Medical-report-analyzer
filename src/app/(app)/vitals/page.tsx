import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardTitle, PageHeader, flagTone } from "@/components/ui";
import { VitalsForm } from "@/components/vitals-form";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { biomarkerName, fmtDate, fmtNum } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { listObservations } from "@/lib/queries";

export const metadata: Metadata = { title: "Log reading" };

export default async function VitalsPage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, obs] = await Promise.all([getI18n(), listObservations(user.id, active.id)]);
  const recent = obs.filter((o) => o.source === "manual").slice(-12).reverse();
  return (
    <>
      <PageHeader title={t("vitals.title")} subtitle={`${t("vitals.subtitle")} — ${active.name}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><VitalsForm profileId={active.id} /></Card></div>
        <Card className="h-fit">
          <CardTitle>{t("trends.history")}</CardTitle>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/trends/${o.code}`} className="min-w-0 truncate hover:underline">{biomarkerName(o.code, o.name, locale)}</Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular">{fmtNum(o.valueNum, 1)} <span className="text-xs text-muted">{o.unit}</span></span>
                    <Badge tone={flagTone(o.flag)}>{t(`flags.${o.flag}`)}</Badge>
                    <span className="text-xs text-muted">{fmtDate(o.observedAt, locale, { year: undefined })}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
