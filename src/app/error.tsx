"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui";

// Never render error details: they could contain health data.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">{t("common.genericError")}</h1>
      <Button className="mt-6" onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
