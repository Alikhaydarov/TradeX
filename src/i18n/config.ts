export const locales = ["en", "es", "uz", "ru", "ko"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "tradoxy-locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  uz: "O'zbek",
  ru: "Русский",
  ko: "한국어",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function localeFromAcceptLanguage(value: string | null): Locale {
  if (!value) return defaultLocale;
  const requested = value
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  return (
    locales.find((locale) =>
      requested.some((language) => language === locale || language?.startsWith(`${locale}-`)),
    ) ?? defaultLocale
  );
}
