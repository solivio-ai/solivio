"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@solivio/ui/components/collapsible.tsx";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@solivio/ui/components/sidebar.tsx";
import { navRegistry } from "@/generated/nav";

interface AdminSidebarSectionProps {
  pathname: string;
  onNavigate: () => void;
}

const adminItems = [{ labelKey: "users", href: "/admin/users", icon: Users }] as const;

const moduleAdminItems = navRegistry.filter((entry) => entry.section === "admin");

export function AdminSidebarSection({ pathname, onNavigate }: AdminSidebarSectionProps) {
  const t = useTranslations("AppSidebar");
  const tModules = useTranslations();

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
                    <SidebarMenuButton asChild isActive={pathname === href} tooltip={label}>
                      <Link href={href} onClick={onNavigate}>
                        <Icon size={16} aria-hidden="true" />
                        <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {moduleAdminItems.map((entry) => {
                const label = tModules(`${entry.moduleId}.${entry.labelKey}`);
                const Icon = entry.icon;
                return (
                  <SidebarMenuItem key={entry.id}>
                    <SidebarMenuButton asChild isActive={pathname === entry.href} tooltip={label}>
                      <Link href={entry.href} onClick={onNavigate}>
                        <Icon className="size-4" aria-hidden="true" />
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
