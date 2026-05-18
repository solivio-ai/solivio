"use client";

import { ChevronRight, Package, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AdminSidebarSectionProps {
  pathname: string;
  onNavigate: () => void;
}

const adminItems = [
  { labelKey: "users", href: "/admin/users", icon: Users },
  { labelKey: "catalogUpload", href: "/admin/products/upload", icon: Package },
] as const;

export function AdminSidebarSection({ pathname, onNavigate }: AdminSidebarSectionProps) {
  const t = useTranslations("AppSidebar");

  return (
    <Collapsible defaultOpen={false} className="group/admin-section">
      <SidebarGroup className="p-0 pt-4">
        <SidebarGroupLabel asChild className="group-data-[collapsible=icon]:hidden">
          <CollapsibleTrigger className="flex w-full items-center px-3 hover:text-sidebar-foreground">
            {t("nav.adminGroup")}
            <ChevronRight
              size={14}
              className="ml-auto transition-transform group-data-[state=open]/admin-section:rotate-90"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {adminItems.map(({ labelKey, href, icon: Icon }) => {
                const label = t(`nav.${labelKey}`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      tooltip={label}
                      className={cn(
                        "h-10 rounded-lg !bg-transparent px-3 text-[15px] font-medium text-sidebar-foreground/65 hover:!bg-background/70 hover:text-sidebar-foreground",
                        "data-[active=true]:!bg-background data-[active=true]:text-secondary data-[active=true]:shadow-[inset_3px_0_0_hsl(var(--primary)),0_1px_2px_hsl(var(--border)/0.7)] dark:data-[active=true]:!bg-primary/12 dark:data-[active=true]:text-sidebar-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden",
                        "group-data-[collapsible=icon]:data-[active=true]:!bg-primary/15 group-data-[collapsible=icon]:data-[active=true]:text-sidebar-foreground group-data-[collapsible=icon]:data-[active=true]:shadow-none group-data-[collapsible=icon]:data-[active=true]:ring-1 group-data-[collapsible=icon]:data-[active=true]:ring-primary/45 dark:group-data-[collapsible=icon]:data-[active=true]:!bg-primary/20",
                      )}
                    >
                      <Link href={href} onClick={onNavigate}>
                        <Icon size={16} aria-hidden="true" />
                        <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
