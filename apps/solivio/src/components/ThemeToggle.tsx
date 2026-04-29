"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const cookieMaxAge = 60 * 60 * 24 * 365;

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const t = useTranslations("ThemeToggle");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function applyTheme(nextTheme: Theme) {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.cookie = `solivio-theme=${nextTheme}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
    setTheme(nextTheme);
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      aria-label={t("switchTo", { mode: t(`modes.${nextTheme}`) })}
      onClick={() => applyTheme(nextTheme)}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
