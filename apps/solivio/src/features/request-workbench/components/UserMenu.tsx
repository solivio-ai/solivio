"use client";

import { LogOut, User } from "lucide-react";
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
  const { data: session } = useSession();
  const { signOut } = authClient;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="gap-2">
          <User size={16} aria-hidden="true" />
          <span>{session?.user.name || session?.user.email}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          Signed in as
        </DropdownMenuLabel>
        <DropdownMenuLabel className="-mt-1">{session?.user.name || session?.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOut size={14} aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
