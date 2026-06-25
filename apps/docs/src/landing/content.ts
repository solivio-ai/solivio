import { enLandingContent } from "./content/locales/en";
import { plLandingContent } from "./content/locales/pl";
import type { LandingContent, LandingLocale } from "./content/types";
import { defaultLandingLocale, landingLocales } from "./content/types";

export { deraveReferralUrl, deraveUrl, githubUrl, siteOrigin } from "./content/links";
export type { LandingContent, LandingLocale } from "./content/types";
export { defaultLandingLocale, landingLocales };

export const landingPages = {
  en: enLandingContent,
  pl: plLandingContent,
} satisfies Record<LandingLocale, LandingContent>;

export const isLandingLocale = (locale: string | undefined): locale is LandingLocale =>
  landingLocales.includes(locale as LandingLocale);

export const getLandingPage = (locale: string | undefined) =>
  landingPages[isLandingLocale(locale) ? locale : defaultLandingLocale];
