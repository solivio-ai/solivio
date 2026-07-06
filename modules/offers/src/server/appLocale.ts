/**
 * Server-side locale helpers for offer generation — not UI i18n (that stays in next-intl).
 *
 * Unmatched items store `{ item, reason }`. Reasons come from two places:
 * 1. The generation agent — writes `reason`/`rationale` in the same language as the
 *    customer request (inferred from the request text, not from APP_LOCALE).
 * 2. offerService post-processing — adds unmatched rows the agent never sees (duplicate
 *    productId collapse, product UUID missing from DB). The agent never sees the request
 *    for these, so they fall back to fixed copy keyed by APP_LOCALE here.
 */
import "server-only";

export function getAppLocaleCode(): string {
  return (process.env.APP_LOCALE ?? "pl").toLowerCase().split("-")[0];
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
