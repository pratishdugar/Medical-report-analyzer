import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth-forms";
import { Alert, Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await searchParams;
  const { t } = await getI18n();
  return (
    <Card className="p-6">
      <h1 className="mb-5 text-2xl font-semibold">{t("auth.resetTitle")}</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Alert tone="bad">
          {t("auth.errors.invalidToken")} <Link href="/forgot-password" className="underline">{t("auth.forgotCta")}</Link>
        </Alert>
      )}
    </Card>
  );
}
