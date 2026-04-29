"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { defaultLocale, isLocale, localeCookieName, locales } from "@/i18n/locales";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const router = useRouter();
  const activeLocale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const value = isLocale(activeLocale) ? activeLocale : defaultLocale;

  function handleLocaleChange(nextLocale: string) {
    if (!isLocale(nextLocale) || nextLocale === value) return;

    document.cookie = [
      `${localeCookieName}=${nextLocale}`,
      "path=/",
      `max-age=${cookieMaxAgeSeconds}`,
      "samesite=lax",
    ].join("; ");
    router.refresh();
  }

  return (
    <div className="px-2">
      <Select value={value} onValueChange={handleLocaleChange}>
        <SelectTrigger className="w-full" aria-label={t("label")}>
          <Languages size={16} aria-hidden="true" />
          <span className="truncate">{t(`languages.${value}`)}</span>
        </SelectTrigger>
        <SelectContent position="popper" side="top" align="start" className="min-w-(--radix-select-trigger-width)">
          {locales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {t(`languages.${locale}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
