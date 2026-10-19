"use client";

import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { Alert, Button } from "./ui";
import { useI18n } from "./i18n-provider";
import type { ActionState } from "@/lib/validation";
import { setLocaleAction } from "@/app/(auth)/actions";

export function SubmitButton({ children, pendingLabel, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? t("common.saving")) : children}
    </Button>
  );
}

/** Renders the form-level error / success message of an ActionState. */
export function FormMessage({ state }: { state: ActionState }) {
  const { t } = useI18n();
  if (state.error) return <Alert tone="bad">{t(state.error)}</Alert>;
  if (state.message) return <Alert tone="ok">{t(state.message, state.data as Record<string, string>)}</Alert>;
  return null;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  return (
    <form action={setLocaleAction} className={className}>
      <input type="hidden" name="back" value={pathname} />
      <div className="inline-flex overflow-hidden rounded-lg border border-border text-sm" role="group" aria-label="Language">
        <button name="locale" value="en" className={`px-3 py-1.5 ${locale === "en" ? "bg-primary text-primary-fg" : "bg-surface"}`} aria-pressed={locale === "en"}>
          EN
        </button>
        <button name="locale" value="hi" lang="hi" className={`px-3 py-1.5 ${locale === "hi" ? "bg-primary text-primary-fg" : "bg-surface"}`} aria-pressed={locale === "hi"}>
          हिं
        </button>
      </div>
    </form>
  );
}
