"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@solivio/ui/components/dialog.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { Label } from "@solivio/ui/components/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@solivio/ui/components/select.tsx";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("CreateUserDialog");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setError(null);

    startTransition(async () => {
      const { error: createError } = await authClient.admin.createUser({
        name,
        email,
        password,
        role,
      });

      if (createError) {
        const code = (createError.code ?? "").toLowerCase();
        if (code.includes("email") || code.includes("exist")) {
          setError(t("errors.emailTaken"));
        } else {
          setError(t("errors.generic"));
        }
        return;
      }

      form.reset();
      setRole("user");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field htmlFor="create-name" label={t("fields.name")}>
            <Input id="create-name" name="name" required autoComplete="off" disabled={isPending} />
          </Field>

          <Field htmlFor="create-email" label={t("fields.email")}>
            <Input
              id="create-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              disabled={isPending}
            />
          </Field>

          <Field htmlFor="create-password" label={t("fields.password")}>
            <Input
              id="create-password"
              name="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              disabled={isPending}
            />
          </Field>

          <Field htmlFor="create-role" label={t("fields.role")}>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "user" | "admin")}
              disabled={isPending}
            >
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("roles.user")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("actions.submitting") : t("actions.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
