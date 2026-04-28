"use client";

import { LogOut } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <section
      className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-2 text-card-foreground"
      aria-label="Signed-in user"
    >
      <span className="text-sm font-semibold">
        {session.user.name || session.user.email}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={16} aria-hidden="true" />
      </Button>
    </section>
  );
}
