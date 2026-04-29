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
  useSidebar,
} from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <Button asChild className="w-full justify-start" size="sm">
          <Link href="/offers/new" onClick={closeMobileSidebar}>
            <Plus size={16} aria-hidden="true" />
            {t("actions.newOffer")}
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarContent className="pt-1.5">
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
                  <Link href={href} onClick={closeMobileSidebar}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{t(`nav.${labelKey}`)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border pb-3 pt-2">
        <LanguageSwitcher />
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
