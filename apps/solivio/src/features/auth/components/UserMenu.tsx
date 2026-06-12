"use client";

import { KeyRound, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";
import { SidebarMenuButton } from "@solivio/ui/components/sidebar.tsx";
import { authClient, useSession } from "@/lib/auth-client";

import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function UserMenu() {
  const t = useTranslations("UserMenu");
  const { data: session } = useSession();
  const { signOut } = authClient;
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleSignOut = () =>
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });

  const displayName = session?.user.name || session?.user.email || "";
  const hasCredentials = !!session?.user;

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={displayName}
            className="h-9 flex-1 gap-2 rounded-lg !bg-transparent px-3 text-sidebar-foreground/70 hover:!bg-background/70 hover:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden"
          >
            <User size={16} aria-hidden="true" />
            <span>{displayName}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
            {t("signedInAs")}
          </DropdownMenuLabel>
          <DropdownMenuLabel className="-mt-1">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hasCredentials && (
            <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
              <KeyRound size={14} aria-hidden="true" />
              {t("changePassword")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut size={14} aria-hidden="true" />
            {t("logOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
