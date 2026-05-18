"use client";

import { ArrowUpDown, ListFilter, MoreHorizontal, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";

import { CreateUserDialog } from "./CreateUserDialog";
import type { EditableUser } from "./EditUserSheet";
import { EditUserSheet } from "./EditUserSheet";

type User = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  createdAt: Date | string;
};

type UsersTableProps = {
  users: User[];
  currentUserId: string;
};

type RoleFilter = "all" | "admin" | "user";
type SortKey = "joinedDesc" | "joinedAsc" | "nameAsc" | "nameDesc";

function toJoinedMs(value: Date | string): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatDate(value: Date | string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function roleLabel(role: string | null | undefined, t: (key: string) => string): string {
  const key = role ?? "user";
  if (key === "admin") return t("roles.admin");
  if (key === "user") return t("roles.user");
  return key;
}

function matchesRoleFilter(user: User, roleFilter: RoleFilter): boolean {
  if (roleFilter === "all") return true;
  const isAdmin = user.role === "admin";
  if (roleFilter === "admin") return isAdmin;
  return !isAdmin;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const t = useTranslations("UsersTable");
  const locale = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedDesc");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = users.filter((user) => {
      if (!matchesRoleFilter(user, roleFilter)) return false;
      if (!normalizedQuery) return true;

      const name = user.name.toLowerCase();
      const email = user.email.toLowerCase();
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "joinedAsc":
          return toJoinedMs(a.createdAt) - toJoinedMs(b.createdAt);
        case "nameAsc":
          return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
        case "nameDesc":
          return b.name.localeCompare(a.name, locale, { sensitivity: "base" });
        default:
          return toJoinedMs(b.createdAt) - toJoinedMs(a.createdAt);
      }
    });

    return sorted;
  }, [users, query, roleFilter, sortKey, locale]);

  function openEdit(user: User) {
    setEditingUser({ id: user.id, name: user.name, email: user.email, role: user.role });
    setEditSheetOpen(true);
  }

  function confirmDelete(user: User) {
    setDeletingUser(user);
  }

  function handleDelete() {
    if (!deletingUser) return;
    const userId = deletingUser.id;
    startDeleteTransition(async () => {
      try {
        await authClient.admin.removeUser({ userId });
        setDeletingUser(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete user");
      }
    });
  }

  if (users.length === 0) {
    return (
      <>
        <div className="flex justify-end">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            {t("actions.newUser")}
          </Button>
        </div>
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search.placeholder")}
            className="pl-8"
            aria-label={t("search.label")}
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <ListFilter size={16} aria-hidden="true" className="text-muted-foreground" />
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
            <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="admin">{t("filters.admin")}</SelectItem>
              <SelectItem value="user">{t("filters.user")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <ArrowUpDown size={16} aria-hidden="true" className="text-muted-foreground" />
          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger className="w-full sm:w-52" aria-label={t("sort.label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="joinedDesc">{t("sort.joinedDesc")}</SelectItem>
              <SelectItem value="joinedAsc">{t("sort.joinedAsc")}</SelectItem>
              <SelectItem value="nameAsc">{t("sort.nameAsc")}</SelectItem>
              <SelectItem value="nameDesc">{t("sort.nameDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          {t("actions.newUser")}
        </Button>
      </div>

      {visibleUsers.length === 0 ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>{t("matchingEmpty.title")}</EmptyTitle>
            <EmptyDescription>{t("matchingEmpty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
              }}
            >
              {t("actions.clearFilters")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.role")}</TableHead>
              <TableHead>{t("columns.joined")}</TableHead>
              <TableHead>{t("columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {roleLabel(user.role, t)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt, locale)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={user.name}>
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(user)}>
                        {t("actions.edit")}
                      </DropdownMenuItem>
                      {user.id !== currentUserId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => confirmDelete(user)}
                          >
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditUserSheet user={editingUser} open={editSheetOpen} onOpenChange={setEditSheetOpen} />

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.deleteConfirmDescription", { name: deletingUser?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {t("actions.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
