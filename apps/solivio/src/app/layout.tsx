import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    metadataBase: new URL("https://solivio.ai"),
    applicationName: "Solivio",
    title: {
      default: "Solivio",
      template: t("titleTemplate"),
    },
    description: t("description"),
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      apple: [{ url: "/favicon.png", type: "image/png" }],
    },
    openGraph: {
      title: "Solivio",
      description: t("openGraphDescription"),
      siteName: "Solivio",
      type: "website",
      url: "/",
    },
    twitter: {
      card: "summary",
      title: "Solivio",
      description: t("twitterDescription"),
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);
  const theme = cookieStore.get("solivio-theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang={locale}
      className={cn(theme === "dark" && "dark", inter.variable)}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
