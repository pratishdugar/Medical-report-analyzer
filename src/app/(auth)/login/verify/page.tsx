import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/dal";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Verify" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.session.mfaPending) redirect("/dashboard");
  const { t } = await getI18n();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold">{t("auth.verifyTitle")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("auth.verifySubtitle")}</p>
      <VerifyForm next={sp.next} />
    </Card>
  );
}
