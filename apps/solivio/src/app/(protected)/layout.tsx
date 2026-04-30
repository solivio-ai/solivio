import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentSession } from "@/server/auth/session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="fixed left-3 top-3 z-40 border border-border bg-background shadow-sm md:hidden" />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
