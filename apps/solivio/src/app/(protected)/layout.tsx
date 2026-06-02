import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { isAdmin } from "@/lib/auth";
import { getCurrentSession } from "@/server/auth/session";
import { getModuleAdminNavItems } from "@/server/modules/registry";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const [session, locale] = await Promise.all([getCurrentSession(), getLocale()]);

  if (!session) redirect("/login");

  const adminNavItems = isAdmin(session.user) ? await getModuleAdminNavItems(locale) : [];

  return (
    <SidebarProvider>
      <AppSidebar adminNavItems={adminNavItems} />
      <SidebarInset>
        <SidebarTrigger className="fixed left-3 top-3 z-40 border border-border bg-background shadow-sm md:hidden" />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
