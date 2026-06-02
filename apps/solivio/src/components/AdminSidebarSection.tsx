"use client";

import {
  Building2,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { ModuleUiIcon } from "@solivio/sdk";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AdminSidebarSectionProps {
  moduleNavItems?: AdminModuleNavItem[];
  pathname: string;
  onNavigate: () => void;
}

export interface AdminModuleNavItem {
  href: string;
  icon?: ModuleUiIcon;
  label: string;
}

const coreAdminItems = [{ labelKey: "users", href: "/admin/users", icon: Users }] as const;

const moduleIconMap: Record<ModuleUiIcon, typeof Users> = {
  building: Building2,
  "file-text": FileText,
  "layout-dashboard": LayoutDashboard,
  package: Package,
  plus: Plus,
  upload: Upload,
  users: Users,
};

export function AdminSidebarSection({
  moduleNavItems = [],
  pathname,
  onNavigate,
}: AdminSidebarSectionProps) {
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
              {coreAdminItems.map(({ labelKey, href, icon: Icon }) => {
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
              {moduleNavItems.map(({ href, icon, label }) => {
                const Icon = icon ? moduleIconMap[icon] : Upload;
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
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
