"use client";

import { Building2, ChevronRight, Package, Users } from "lucide-react";
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

interface AdminSidebarSectionProps {
  pathname: string;
  onNavigate: () => void;
}

const adminItems = [
  { labelKey: "users", href: "/admin/users", icon: Users },
  { labelKey: "catalogUpload", href: "/admin/products/upload", icon: Package },
  { labelKey: "customerUpload", href: "/admin/customers/upload", icon: Building2 },
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
