"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

type Props = {
  user: EditableUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditUserSheet({ user, open, onOpenChange }: Props) {
  const t = useTranslations("EditUserSheet");
  const router = useRouter();

  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSettingPassword, startPasswordTransition] = useTransition();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role === "admin" ? "admin" : "user");
      setSaveError(null);
      setPasswordError(null);
      setPasswordSuccess(null);
      setNewPassword("");
    }
  }, [user]);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaveError(null);

    startSaveTransition(async () => {
      const trimmedName = name.trim();
      const nameChanged = trimmedName !== user.name;
      const currentRole = user.role === "admin" ? "admin" : "user";
      const roleChanged = role !== currentRole;

      const ops: Promise<{ error?: unknown }>[] = [];

      if (nameChanged) {
        ops.push(authClient.admin.updateUser({ userId: user.id, data: { name: trimmedName } }));
      }
      if (roleChanged) {
        ops.push(authClient.admin.setRole({ userId: user.id, role }));
      }

      if (ops.length === 0) {
        onOpenChange(false);
        return;
      }

      const results = await Promise.all(ops);
      const hasError = results.some((r) => r.error);
      if (hasError) {
        setSaveError(t("errors.generic"));
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    startPasswordTransition(async () => {
      const { error } = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword,
      });

      if (error) {
        setPasswordError(t("errors.passwordGeneric"));
        return;
      }

      setPasswordSuccess(t("passwordSuccess"));
      setNewPassword("");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{t("title")}</SheetTitle>
          {user && <p className="text-sm text-muted-foreground">{user.email}</p>}
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-4 py-4">
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("sections.info")}
            </p>

            <Field htmlFor="edit-name" label={t("fields.name")}>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSaving}
              />
            </Field>

            <Field htmlFor="edit-role" label={t("fields.role")}>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "user" | "admin")}
                disabled={isSaving}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("roles.user")}</SelectItem>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? t("actions.saving") : t("actions.save")}
            </Button>
          </form>

          <Separator />

          <form onSubmit={handleSetPassword} className="flex flex-col gap-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("sections.password")}
            </p>

            <Field htmlFor="edit-password" label={t("fields.newPassword")}>
              <Input
                id="edit-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                disabled={isSettingPassword}
              />
            </Field>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <p className="text-sm text-emerald-600 dark:text-emerald-500">{passwordSuccess}</p>
            )}

            <Button type="submit" variant="outline" disabled={isSettingPassword}>
              {isSettingPassword ? t("actions.settingPassword") : t("actions.resetPassword")}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
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
