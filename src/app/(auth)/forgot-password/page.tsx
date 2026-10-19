import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPage() {
  const { t } = await getI18n();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold">{t("auth.forgotTitle")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("auth.forgotSubtitle")}</p>
      <ForgotForm />
    </Card>
  );
}
