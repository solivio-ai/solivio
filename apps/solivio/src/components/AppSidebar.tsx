"use client";

import { Database, FileText, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/features/request-workbench/components/UserMenu";

const navItems = [
  { labelKey: "dashboard", href: "/", icon: LayoutDashboard },
  { labelKey: "offers", href: "/offers", icon: FileText },
  { labelKey: "newOffer", href: "/offers/new", icon: Plus },
  { labelKey: "catalogUpload", href: "/products/upload", icon: Database },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("AppSidebar");

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/" className="flex items-center px-2 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/solivio-logo.png"
            alt="Solivio"
            className="h-8 w-auto shrink-0"
          />
        </Link>
        <div className="px-2 pb-3">
          <Button asChild className="w-full" size="sm">
            <Link href="/offers/new">
              <Plus size={16} aria-hidden="true" />
              {t("actions.newOffer")}
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarMenu>
          {navItems.map(({ labelKey, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={active ? "border-l-2 border-primary rounded-l-none text-primary font-semibold" : ""}
                >
                  <Link href={href}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{t(`nav.${labelKey}`)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pb-3 pt-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
