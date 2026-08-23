"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import {
  isLocale,
  localeCookieName,
  localeLabels,
  locales,
  type Locale,
} from "@/i18n/config";

export { localeLabels as labels, locales, type Locale };

type TranslationKey =
  | "home"
  | "journal"
  | "profile"
  | "marketPulse"
  | "accountsRecords"
  | "proofSettings"
  | "shareTrade"
  | "shareJournalTrade"
  | "reviewedOnly"
  | "pickTrade"
  | "searchTrade"
  | "noTrades"
  | "addTradeFirst"
  | "openJournal";

export function useLanguage() {
  const currentLocale = useLocale();
  const translate = useTranslations("legacy");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const locale: Locale = isLocale(currentLocale) ? currentLocale : "en";

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      document.cookie = `${localeCookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.localStorage.setItem("tradeway-locale", next);
      document.documentElement.lang = next;
      startTransition(() => router.refresh());
    },
    [router],
  );

  const t = useCallback((key: TranslationKey) => translate(key), [translate]);

  return { locale, locales, labels: localeLabels, setLocale, t };
}
