import type { Metadata } from "next";
import { revokeShareAction } from "@/actions/share";
import { CreateShareForm } from "@/components/share-forms";
import { Badge, Button, Card, CardTitle, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { fmtDateTime } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { listShareLinks } from "@/lib/queries";

export const metadata: Metadata = { title: "Share with doctor" };

function linkState(l: { revokedAt: Date | null; expiresAt: Date }) {
  if (l.revokedAt) return "revoked";
  return l.expiresAt.getTime() <= Date.now() ? "expired" : "active";
}

export default async function SharePage() {
  const { user } = await requireUser();
  const { active } = await getActiveProfile(user.id);
  const [{ t, locale }, links] = await Promise.all([getI18n(), listShareLinks(user.id, active.id)]);
  return (
    <>
      <PageHeader title={t("share.title")} subtitle={t("share.subtitle", { name: active.name })} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CreateShareForm profileId={active.id} /></Card>
        <Card>
          <CardTitle>{t("share.active")}</CardTitle>
          {links.length === 0 ? (
            <p className="text-sm text-muted">{t("share.none")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {links.map((l) => {
                const state = linkState(l);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.label || t("share.title")}</p>
                      <p className="text-xs text-muted">
                        {t("share.expires", { date: fmtDateTime(l.expiresAt, locale) })} · {t("share.views", { count: l.accessCount })}
                        {l.pinHash ? " · PIN" : ""}{l.includeFiles ? " · 📎" : ""}
                      </p>
                    </div>
                    {state === "active" ? (
                      <form action={revokeShareAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <Button variant="secondary" className="min-h-0 px-3 py-1.5 text-bad">{t("share.revoke")}</Button>
                      </form>
                    ) : (
                      <Badge>{t(`share.${state}`)}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
