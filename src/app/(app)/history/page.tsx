import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { deleteHistoryAction, toggleHistoryAction } from "@/actions/history";
import { HistoryForm } from "@/components/history-form";
import { Badge, Card, CardTitle, EmptyState, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { fmtDate } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { listHistory } from "@/lib/queries";
import { HISTORY_TYPES } from "@/lib/validation";

export const metadata: Metadata = { title: "Medical history" };

export default async function HistoryPage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, entries] = await Promise.all([getI18n(), listHistory(user.id, active.id)]);
  return (
    <>
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle", { name: active.name })} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {entries.length === 0 && <EmptyState title={t("history.empty")} />}
          {HISTORY_TYPES.filter((type) => entries.some((e) => e.type === type)).map((type) => (
            <Card key={type}>
              <CardTitle>{t(`history.types.${type}`)}</CardTitle>
              <ul className="divide-y divide-border">
                {entries.filter((e) => e.type === type).map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {e.title}{" "}
                        <Badge tone={e.active ? "primary" : "neutral"}>{e.active ? t("history.active") : t("history.past")}</Badge>
                      </p>
                      {(e.startDate || e.endDate) && (
                        <p className="text-xs text-muted">{fmtDate(e.startDate, locale)}{e.endDate ? ` → ${fmtDate(e.endDate, locale)}` : ""}</p>
                      )}
                      {e.details && <p className="mt-1 whitespace-pre-line text-sm text-muted">{e.details}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggleHistoryAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="rounded px-2 py-1 text-xs text-primary hover:bg-surface-2">{e.active ? t("history.past") : t("history.active")}</button>
                      </form>
                      <form action={deleteHistoryAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-bad" aria-label={`${t("common.delete")} ${e.title}`}><Trash2 size={15} /></button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <Card className="h-fit lg:col-span-2">
          <CardTitle>{t("history.add")}</CardTitle>
          <HistoryForm profileId={active.id} />
        </Card>
      </div>
    </>
  );
}
