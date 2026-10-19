import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Alert, Card } from "@/components/ui";
import { getSession } from "@/lib/dal";
import { getI18n } from "@/lib/i18n/server";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session && !session.session.mfaPending) redirect(safeNext(sp.next));
  const { t } = await getI18n();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold">{t("auth.loginTitle")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("auth.loginSubtitle")}</p>
      {sp.reset && <Alert tone="ok" className="mb-4">{t("auth.resetDone")}</Alert>}
      <LoginForm next={sp.next} />
    </Card>
  );
}
