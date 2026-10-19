import { LinkButton } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">{t("common.notFound")}</h1>
      <p className="mt-1 text-sm text-muted">{t("common.notFoundBody")}</p>
      <LinkButton href="/dashboard" className="mt-6">{t("common.goHome")}</LinkButton>
    </div>
  );
}
