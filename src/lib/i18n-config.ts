export const locales = ["en", "uz", "ru", "ko"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "tradox-locale";
export const legacyLocaleStorageKey = "tradeway-locale";
export const localeStorageKey = "tradox-locale";

export const localeTags: Record<Locale, string> = {
  en: "en-US",
  uz: "uz-Latn-UZ",
  ru: "ru-RU",
  ko: "ko-KR",
};

export const labels: Record<Locale, string> = {
  en: "English",
  uz: "O‘zbekcha",
  ru: "Русский",
  ko: "한국어",
};

export const languageOptions = locales.map((value) => ({
  value,
  label: labels[value],
  tag: localeTags[value],
}));

export function normalizeLocale(value?: string | null): Locale {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "es" || normalized.startsWith("es-")) return "en";
  if (normalized === "uz" || normalized.startsWith("uz-")) return "uz";
  if (normalized === "ru" || normalized.startsWith("ru-")) return "ru";
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return defaultLocale;
}
