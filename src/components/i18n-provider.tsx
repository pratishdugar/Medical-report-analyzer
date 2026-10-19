"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Messages } from "@/lib/i18n/en";
import { makeT, type Locale, type TFunction } from "@/lib/i18n";

type Ctx = { locale: Locale; messages: Messages; t: TFunction };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages, t: makeT(messages) }), [locale, messages]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
