import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentSession } from "@/server/auth/session";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://solivio.ai"),
  applicationName: "Solivio",
  title: {
    default: "Solivio",
    template: "%s | Solivio"
  },
  description: "Solivio is an open-source AI system that transforms how B2B companies create offers.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }]
  },
  openGraph: {
    title: "Solivio",
    description:
      "Instead of building every quote manually, Solivio generates structured offer drafts based on your data — in seconds.",
    siteName: "Solivio",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary",
    title: "Solivio",
    description: "AI-assisted offer drafts from customer requests and catalog data."
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [session, headerList, locale] = await Promise.all([
    getCurrentSession(),
    headers(),
    getLocale(),
  ]);
  const pathname = headerList.get("x-pathname") ?? "";

  if (!session && !pathname.startsWith("/login")) {
    redirect("/login");
  }

  return (
    <html lang={locale} className={cn("dark", inter.variable)}>
      <body>
        <NextIntlClientProvider>
          <TooltipProvider>
            {session ? (
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <header className="flex h-9 shrink-0 items-center border-b border-border px-2">
                    <SidebarTrigger />
                  </header>
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
