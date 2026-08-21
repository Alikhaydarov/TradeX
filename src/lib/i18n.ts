"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "@/locales/en.json";
import ko from "@/locales/ko.json";
import ru from "@/locales/ru.json";
import uz from "@/locales/uz.json";
import {
  defaultLocale,
  labels,
  languageOptions,
  legacyLocaleStorageKey,
  localeCookieName,
  locales,
  localeStorageKey,
  localeTags,
  normalizeLocale,
  type Locale,
} from "./i18n-config";

export {
  defaultLocale,
  labels,
  languageOptions,
  localeCookieName,
  locales,
  localeTags,
  normalizeLocale,
};
export type { Locale };

const catalogs = { en, uz, ru, ko } as const;
type Catalog = typeof en;
export type TranslationKey = Exclude<keyof Catalog, "_legacy">;
export type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>;

function canonicalText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const legacyIndexes = Object.fromEntries(
  locales.map((locale) => [
    locale,
    new Map(
      Object.entries(catalogs[locale]._legacy).map(([key, value]) => [
        canonicalText(key),
        value,
      ]),
    ),
  ]),
) as Record<Locale, Map<string, string>>;

function interpolate(message: string, values?: TranslationValues) {
  if (!values) return message;
  return message.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? match : String(value);
  });
}

function detectClientLocale(initialLocale: Locale): Locale {
  if (typeof window === "undefined") return initialLocale;
  const stored =
    window.localStorage.getItem(localeStorageKey) ??
    window.localStorage.getItem(legacyLocaleStorageKey);
  if (stored) return normalizeLocale(stored);
  return normalizeLocale(window.navigator.language || initialLocale);
}

function writeLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localeStorageKey, locale);
  window.localStorage.removeItem(legacyLocaleStorageKey);
  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = localeTags[locale];
  document.documentElement.dir = "ltr";
  document.documentElement.dataset.locale = locale;
}

type I18nContextValue = {
  locale: Locale;
  locales: typeof locales;
  labels: typeof labels;
  languageOptions: typeof languageOptions;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  translateText: (text: string, values?: TranslationValues) => string;
  formatNumber: (
    value: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
  formatDate: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
  ) => string;
};

const fallbackContext: I18nContextValue = {
  locale: defaultLocale,
  locales,
  labels,
  languageOptions,
  setLocale: () => undefined,
  t: (key, values) => interpolate(String(catalogs.en[key]), values),
  translateText: (text, values) => interpolate(text, values),
  formatNumber: (value, options) =>
    new Intl.NumberFormat(localeTags.en, options).format(value),
  formatDate: (value, options) =>
    new Intl.DateTimeFormat(localeTags.en, options).format(
      value instanceof Date ? value : new Date(value),
    ),
  formatRelativeTime: (value, unit) =>
    new Intl.RelativeTimeFormat(localeTags.en, { numeric: "auto" }).format(
      value,
      unit,
    ),
};

const I18nContext = createContext<I18nContextValue>(fallbackContext);

export function I18nProvider({
  initialLocale = defaultLocale,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const normalizedInitial = normalizeLocale(initialLocale);
  const [locale, setLocaleState] = useState<Locale>(normalizedInitial);

  useEffect(() => {
    const detected = detectClientLocale(normalizedInitial);
    setLocaleState(detected);
    writeLocale(detected);
  }, [normalizedInitial]);

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (
        event.key !== localeStorageKey &&
        event.key !== legacyLocaleStorageKey
      ) {
        return;
      }
      const next = normalizeLocale(event.newValue);
      setLocaleState(next);
      writeLocale(next);
    };
    const syncCustom = (event: Event) => {
      const next = normalizeLocale(
        (event as CustomEvent<{ locale?: string }>).detail?.locale ??
          window.localStorage.getItem(localeStorageKey),
      );
      setLocaleState(next);
      writeLocale(next);
    };
    window.addEventListener("storage", syncStorage);
    window.addEventListener("tradox:locale", syncCustom);
    window.addEventListener("tradeway:locale", syncCustom);
    return () => {
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener("tradox:locale", syncCustom);
      window.removeEventListener("tradeway:locale", syncCustom);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    writeLocale(normalized);
    window.dispatchEvent(
      new CustomEvent("tradox:locale", { detail: { locale: normalized } }),
    );
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => {
      const message = catalogs[locale][key] ?? catalogs.en[key] ?? String(key);
      return interpolate(String(message), values);
    },
    [locale],
  );

  const translateText = useCallback(
    (text: string, values?: TranslationValues) => {
      const normalized = canonicalText(text);
      const translated =
        legacyIndexes[locale].get(normalized) ??
        legacyIndexes.en.get(normalized) ??
        text;
      return interpolate(translated, values);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => {
    const tag = localeTags[locale];
    return {
      locale,
      locales,
      labels,
      languageOptions,
      setLocale,
      t,
      translateText,
      formatNumber: (number, options) =>
        new Intl.NumberFormat(tag, options).format(number),
      formatDate: (date, options) =>
        new Intl.DateTimeFormat(tag, options).format(
          date instanceof Date ? date : new Date(date),
        ),
      formatRelativeTime: (number, unit) =>
        new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(
          number,
          unit,
        ),
    };
  }, [locale, setLocale, t, translateText]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useLanguage() {
  return useContext(I18nContext);
}
