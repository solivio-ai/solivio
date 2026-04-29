"use client";

import { Database, FileText, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
import { SolivioLogo } from "@/components/SolivioLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          className="flex min-w-0 items-center"
          aria-label="Solivio home"
        >
          <SolivioLogo
            width={180}
            height={60}
            sizes="180px"
            className="h-8 w-auto max-w-[160px] object-contain"
            priority
          />
        </Link>
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
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <LanguageSwitcher />
          </div>
          <ThemeToggle className="ml-auto" />
        </div>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
