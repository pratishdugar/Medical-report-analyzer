import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { dictionaries, LOCALE_COOKIE, makeT, normalizeLocale, type Locale } from ".";

export const getLocale = cache(async (): Promise<Locale> => normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value));

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const messages = dictionaries[locale];
  return { locale, messages, t: makeT(messages) };
});
