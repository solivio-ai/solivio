/**
 * Server-side locale helpers for offer generation — not UI i18n (that stays in next-intl).
 *
 * Unmatched items store `{ item, reason }`. Reasons come from two places:
 * 1. The generation agent — writes `reason` per fragment in the language named by
 *    `getAppLocaleLanguage()` (driven by APP_LOCALE, same as rationale).
 * 2. offerService post-processing — adds unmatched rows the agent never sees (duplicate
 *    productId collapse, product UUID missing from DB). Those need fixed copy here.
 *
 * Centralizing APP_LOCALE here keeps agent instructions and server-synthesized reasons aligned.
 */
import "server-only";

const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  pl: "Polish",
  en: "English",
  de: "German",
  fr: "French",
};

export function getAppLocaleCode(): string {
  return (process.env.APP_LOCALE ?? "pl").toLowerCase().split("-")[0];
}

export function getAppLocaleLanguage(): string {
  return LOCALE_LANGUAGE_MAP[getAppLocaleCode()] ?? "Polish";
}

const DUPLICATE_UNMATCHED_REASON: Record<string, string> = {
  pl: "Inna pozycja w tej ofercie jest już dopasowana do tego samego produktu z katalogu.",
  en: "Another line in this offer already matches this catalog product.",
};

const HALLUCINATED_UNMATCHED_REASON: Record<string, string> = {
  pl: "Wygenerowany identyfikator produktu nie został znaleziony w katalogu.",
  en: "The generated product ID was not found in the catalog.",
};

export function duplicateUnmatchedReason(): string {
  const locale = getAppLocaleCode();
  return DUPLICATE_UNMATCHED_REASON[locale] ?? DUPLICATE_UNMATCHED_REASON.en;
}

export function hallucinatedUnmatchedReason(): string {
  const locale = getAppLocaleCode();
  return HALLUCINATED_UNMATCHED_REASON[locale] ?? HALLUCINATED_UNMATCHED_REASON.en;
}
