import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/AppSidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://solivio.ai"),
  applicationName: "Solivio",
  title: {
    default: "Solivio",
    template: "%s | Solivio"
  },
  description: "Solivio is an open-source AI system that transforms how B2B companies create offers.",
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
    description: "Quotes shouldn’t take hours. They should start from your data."
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("dark", inter.variable)}>
      <body>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-10 shrink-0 items-center border-b border-border px-3">
                <SidebarTrigger />
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
