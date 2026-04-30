"use client";

import { FileText, LayoutDashboard, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SolivioLogo } from "@/components/SolivioLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/features/request-workbench/components/UserMenu";
import { cn } from "@/lib/utils";

const navItems = [
  { labelKey: "dashboard", href: "/", icon: LayoutDashboard },
  { labelKey: "offers", href: "/offers", icon: FileText },
  { labelKey: "newOffer", href: "/offers/new", icon: Plus },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("AppSidebar");
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex h-9 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="flex min-w-0 flex-1 items-center group-data-[collapsible=icon]:hidden"
            aria-label={t("aria.home")}
          >
            <SolivioLogo
              width={180}
              height={60}
              sizes="180px"
              className="h-8 w-auto max-w-[158px] object-contain"
              priority
            />
          </Link>
          <SidebarTrigger
            className="ml-auto hidden size-8 rounded-lg border border-sidebar-border bg-background/60 text-sidebar-foreground/60 shadow-sm hover:bg-background hover:text-sidebar-foreground focus-visible:border-sidebar-border focus-visible:ring-1 focus-visible:ring-sidebar-border/80 md:flex group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:ml-0"
            aria-label={t("aria.toggleNavigation")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto md:hidden"
            onClick={closeMobileSidebar}
            aria-label={t("aria.closeNavigation")}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="gap-1">
          {navItems.map(({ labelKey, href, icon: Icon }) => {
            const active = pathname === href;
            const label = t(`nav.${labelKey}`);

            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={label}
                  className={cn(
                    "h-10 rounded-lg !bg-transparent px-3 text-[15px] font-medium text-sidebar-foreground/65 hover:!bg-background/70 hover:text-sidebar-foreground",
                    "data-[active=true]:!bg-background data-[active=true]:text-secondary data-[active=true]:shadow-[inset_3px_0_0_hsl(var(--primary)),0_1px_2px_hsl(var(--border)/0.7)] dark:data-[active=true]:!bg-primary/12 dark:data-[active=true]:text-sidebar-foreground",
                    "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden",
                    "group-data-[collapsible=icon]:data-[active=true]:!bg-primary/15 group-data-[collapsible=icon]:data-[active=true]:text-sidebar-foreground group-data-[collapsible=icon]:data-[active=true]:shadow-none group-data-[collapsible=icon]:data-[active=true]:ring-1 group-data-[collapsible=icon]:data-[active=true]:ring-primary/45 dark:group-data-[collapsible=icon]:data-[active=true]:!bg-primary/20",
                  )}
                >
                  <Link href={href} onClick={closeMobileSidebar}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border px-3 pb-3 pt-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
            <LanguageSwitcher className="px-0" />
          </div>
          <ThemeToggle className="ml-auto group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8" />
        </div>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
