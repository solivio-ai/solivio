"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/features/request-workbench/components/UserMenu";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "New Offer", href: "/offers/new", icon: Plus },
];

export function AppSidebar() {
  const pathname = usePathname();

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
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarMenu>
          {navItems.map(({ label, href, icon: Icon }) => {
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
                    <span>{label}</span>
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
    </Sidebar>
  );
}
