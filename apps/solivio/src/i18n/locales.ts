export const locales = ["en", "pl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "solivio-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function matchLocalePreference(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferredLocales = acceptLanguage
    .split(",")
    .map((entry) => {
      const [languageTag, qualityValue] = entry.trim().split(";q=");

      return {
        language: languageTag?.toLowerCase().split("-")[0],
        quality: qualityValue ? Number.parseFloat(qualityValue) : 1,
      };
    })
    .filter(({ language, quality }) => language && Number.isFinite(quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { language } of preferredLocales) {
    if (isLocale(language)) return language;
  }

  return defaultLocale;
}
