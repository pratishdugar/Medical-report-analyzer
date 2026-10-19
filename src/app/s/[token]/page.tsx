import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { HealthSummary } from "@/components/health-summary";
import { LanguageSwitcher } from "@/components/forms";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { SharePinForm } from "@/components/share-forms";
import { Alert, Card } from "@/components/ui";
import { audit } from "@/lib/audit";
import { hit } from "@/lib/auth/rate-limit";
import { shareLinks } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/display";
import { getI18n } from "@/lib/i18n/server";
import { requestMeta } from "@/lib/request";
import { shareCookieName, verifyShareCookie, withSharedLink } from "@/lib/share";
import { loadSummaryData } from "@/lib/summary-data";

// Generic title on purpose: link previews (e.g. WhatsApp) must never show patient details.
export const metadata: Metadata = {
  title: "Shared health summary",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedPage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const [{ t, locale }, meta] = await Promise.all([getI18n(), requestMeta()]);
  const jar = await cookies();
  const limited = !(await hit("sharePerIp", meta.ip)).ok;

  const res = limited
    ? null
    : await withSharedLink(token, async (tx, link) => {
        if (link.pinHash && !verifyShareCookie(link.id, jar.get(shareCookieName(link.id))?.value)) return { needPin: true as const };
        const data = await loadSummaryData(tx, link.userId, link.profileId);
        if (!link.pinHash) {
          await tx.update(shareLinks).set({ accessCount: sql`${shareLinks.accessCount} + 1`, lastAccessedAt: new Date() }).where(eq(shareLinks.id, link.id));
        }
        return { data };
      });
  if (res && !("needPin" in res.result) && !res.link.pinHash) {
    await audit(res.link.userId, "share_accessed", { ip: meta.ip, userAgent: meta.userAgent });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3 no-print">
        <span className="flex items-center gap-2 font-semibold"><LogoMark /> {t("shared.title")}</span>
        <div className="flex items-center gap-2"><LanguageSwitcher />{res && !("needPin" in res.result) && <PrintButton />}</div>
      </header>
      {limited && <Alert tone="bad">{t("common.rateLimited")}</Alert>}
      {!limited && !res && <Alert tone="warn">{t("shared.unavailable")}</Alert>}
      {res && "needPin" in res.result && (
        <Card className="mx-auto max-w-sm"><SharePinForm token={token} /></Card>
      )}
      {res && !("needPin" in res.result) && res.result.data && (
        <>
          <Alert tone="info" className="mb-4 no-print">{t("shared.readOnly", { date: fmtDateTime(res.link.expiresAt, locale) })}</Alert>
          <Card className="print-plain">
            <HealthSummary data={res.result.data} t={t} locale={locale} fileHref={res.link.includeFiles ? (id) => `/api/files/s/${token}/${id}` : undefined} />
          </Card>
        </>
      )}
      <p className="mt-6 text-xs text-muted">{t("disclaimer.short")}</p>
    </div>
  );
}
