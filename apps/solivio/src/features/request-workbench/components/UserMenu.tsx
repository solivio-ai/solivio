"use client";

import { LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { authClient, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const t = useTranslations("UserMenu");
  const { data: session } = useSession();
  const { signOut } = authClient;
  const handleSignOut = () =>
    signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } });

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="flex-1 gap-2">
            <User size={16} aria-hidden="true" />
            <span>{session?.user.name || session?.user.email}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
            {t("signedInAs")}
          </DropdownMenuLabel>
          <DropdownMenuLabel className="-mt-1">{session?.user.name || session?.user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut size={14} aria-hidden="true" />
            {t("logOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
