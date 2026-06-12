"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@solivio/ui/components/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@solivio/ui/components/tooltip.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";
import { defaultLocale, isLocale, localeCookieName, locales } from "@/i18n/locales";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const router = useRouter();
  const activeLocale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const value = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const activeLanguageLabel = t(`languages.${value}`);

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
    <div className={cn("px-2 group-data-[collapsible=icon]:px-0", className)}>
      <Select value={value} onValueChange={handleLocaleChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger
              className={cn(
                "w-full",
                "group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0",
                "group-data-[collapsible=icon]:[&>svg:last-child]:hidden",
              )}
              aria-label={t("label")}
            >
              <Languages size={16} aria-hidden="true" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {activeLanguageLabel}
              </span>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{activeLanguageLabel}</TooltipContent>
        </Tooltip>
        <SelectContent
          position="popper"
          side="top"
          align="start"
          className="min-w-(--radix-select-trigger-width)"
        >
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
