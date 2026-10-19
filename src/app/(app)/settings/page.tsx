import type { Metadata } from "next";
import { Download } from "lucide-react";
import { logoutOthersAction, revokeSessionAction, setAiConsentAction } from "@/actions/settings";
import { AccountForm, DeleteAccountForm, MfaDisable, MfaSetup, PasswordForm } from "@/components/settings-forms";
import { Badge, Button, Card, CardTitle, PageHeader } from "@/components/ui";
import { listSessions } from "@/lib/auth/session";
import { requireUser } from "@/lib/dal";
import { fmtDateTime } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { listAudit } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };

function deviceLabel(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return [browser, os].filter(Boolean).join(" · ");
}

export default async function SettingsPage() {
  const { user, session } = await requireUser();
  const [{ t, locale }, sessionsList, events] = await Promise.all([getI18n(), listSessions(user.id), listAudit(user.id, 25)]);
  return (
    <>
      <PageHeader title={t("settings.title")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("settings.account")}</CardTitle>
          <AccountForm name={user.name} email={user.email} locale={user.locale} />
        </Card>

        <Card>
          <CardTitle>{t("settings.security")}</CardTitle>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("settings.mfa")}</h3>
              {user.totpEnabled ? (
                <div className="space-y-2"><Badge tone="ok">{t("settings.mfaOn")}</Badge><MfaDisable /></div>
              ) : (
                <MfaSetup />
              )}
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold">{t("settings.changePassword")}</h3>
              <PasswordForm />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("settings.sessions")}</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {sessionsList.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{deviceLabel(s.userAgent)} {s.id === session.id && <Badge tone="primary">{t("settings.thisDevice")}</Badge>}</p>
                  <p className="text-xs text-muted">{t("settings.lastActive", { date: fmtDateTime(s.lastSeenAt, locale) })}{s.ip ? ` · ${s.ip}` : ""}</p>
                </div>
                {s.id !== session.id && (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button variant="ghost" className="min-h-0 px-3 py-1.5 text-bad">{t("settings.revoke")}</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {sessionsList.length > 1 && (
            <form action={logoutOthersAction} className="mt-3"><Button variant="secondary">{t("settings.logoutAll")}</Button></form>
          )}
        </Card>

        <Card>
          <CardTitle>{t("settings.privacy")}</CardTitle>
          <div className="space-y-5">
            <form action={setAiConsentAction} className="space-y-2">
              <h3 className="text-sm font-semibold">{t("settings.aiTitle")}</h3>
              <p className="text-sm text-muted">{t("settings.aiBody")}</p>
              <input type="hidden" name="ai" value={user.aiConsent ? "" : "on"} />
              <div className="flex items-center gap-3">
                <Badge tone={user.aiConsent ? "ok" : "neutral"}>{user.aiConsent ? "ON" : "OFF"}</Badge>
                <Button variant="secondary" className="min-h-0 px-3 py-1.5">{user.aiConsent ? t("settings.aiOffLabel") : t("settings.aiOnLabel")}</Button>
              </div>
            </form>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">{t("settings.export")}</h3>
              <p className="mb-2 text-sm text-muted">{t("settings.exportBody")}</p>
              <a href="/api/export" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-2">
                <Download size={16} aria-hidden /> {t("settings.export")}
              </a>
            </div>
            <div className="border-t border-border pt-4"><DeleteAccountForm /></div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>{t("settings.activity")}</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className={e.action.includes("failed") ? "text-bad" : undefined}>{t(`settings.actions.${e.action}`)}</span>
                <span className="text-xs text-muted">{fmtDateTime(e.createdAt, locale)}{e.ip ? ` · ${e.ip}` : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
