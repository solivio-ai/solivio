import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentSession } from "@/server/auth/session";

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
  const [session, headerList, locale, cookieStore] = await Promise.all([
    getCurrentSession(),
    headers(),
    getLocale(),
    cookies(),
  ]);
  const theme = cookieStore.get("solivio-theme")?.value === "dark" ? "dark" : "light";
  const pathname = headerList.get("x-pathname") ?? "";

  if (!session && !pathname.startsWith("/login")) {
    redirect("/login");
  }

  return (
    <html lang={locale} className={cn(theme === "dark" && "dark", inter.variable)} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <TooltipProvider>
            {session ? (
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <SidebarTrigger className="fixed left-3 top-3 z-40 border border-border bg-background shadow-sm md:hidden" />
                  {children}
                </SidebarInset>
              </SidebarProvider>
            ) : (
              children
            )}
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
