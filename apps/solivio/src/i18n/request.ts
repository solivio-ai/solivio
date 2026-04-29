import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { isLocale, localeCookieName, matchLocalePreference } from "./locales";

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const requestedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(requestedLocale)
    ? requestedLocale
    : matchLocalePreference(headerStore.get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
