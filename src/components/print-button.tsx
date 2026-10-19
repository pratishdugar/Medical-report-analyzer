"use client";

import { Printer } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { Button } from "./ui";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer size={16} aria-hidden /> {t("common.print")}
    </Button>
  );
}
