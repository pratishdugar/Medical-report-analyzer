import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { Alert, Card } from "@/components/ui";
import { getSession } from "@/lib/dal";
import { env } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const session = await getSession();
  if (session && !session.session.mfaPending) redirect("/dashboard");
  const { t } = await getI18n();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold">{t("auth.signupTitle")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("auth.signupSubtitle")}</p>
      {env().ALLOW_SIGNUPS ? <SignupForm /> : <Alert tone="warn">{t("auth.errors.signupsClosed")}</Alert>}
    </Card>
  );
}
