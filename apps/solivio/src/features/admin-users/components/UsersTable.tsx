"use client";

import { ArrowUpDown, ListFilter, MoreHorizontal, Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
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
} from "@solivio/ui/components/alert-dialog.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@solivio/ui/components/empty.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@solivio/ui/components/pagination.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@solivio/ui/components/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@solivio/ui/components/table.tsx";
import { isAdmin } from "@/lib/auth";
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
  total: number;
  limit: number;
  offset: number;
  currentUserId: string;
};

type RoleFilter = "all" | "admin" | "user";
type SortKey = "joinedDesc" | "joinedAsc" | "nameAsc" | "nameDesc";

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

function buildPageHref(
  searchParams: URLSearchParams,
  page: number,
  extraParams?: Record<string, string>,
): string {
  const next = new URLSearchParams(searchParams.toString());
  next.set("page", String(page));
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
  }
  return `?${next.toString()}`;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (currentPage > 3) pages.push("ellipsis");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function UsersTable({ users, total, limit, offset, currentUserId }: UsersTableProps) {
  const t = useTranslations("UsersTable");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isPending, startTransition] = useTransition();

  const searchValue = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(searchValue);
  const roleFilter = (searchParams.get("role") ?? "all") as RoleFilter;
  const sortKey = (searchParams.get("sort") ?? "joinedDesc") as SortKey;

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all" && value !== "joinedDesc") {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      next.delete("page");
      startTransition(() => {
        router.push(`?${next.toString()}`);
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (searchInput === searchValue) return;
    const timer = setTimeout(() => pushParams({ search: searchInput }), 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchValue, pushParams]);

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

  function clearFilters() {
    setSearchInput("");
    startTransition(() => {
      router.push("?");
    });
  }

  const hasActiveFilters = searchValue !== "" || roleFilter !== "all";

  if (total === 0 && !hasActiveFilters) {
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

  const pageNumbers = getPageNumbers(currentPage, totalPages);

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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("search.placeholder")}
            className="pl-8"
            aria-label={t("search.label")}
            disabled={isPending}
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <ListFilter size={16} aria-hidden="true" className="text-muted-foreground" />
          <Select
            value={roleFilter}
            onValueChange={(value) => pushParams({ role: value })}
            disabled={isPending}
          >
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
          <Select
            value={sortKey}
            onValueChange={(value) => pushParams({ sort: value })}
            disabled={isPending}
          >
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

        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
          disabled={isPending}
        >
          <Plus size={16} />
          {t("actions.newUser")}
        </Button>
      </div>

      {users.length === 0 ? (
        <Empty className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>{t("matchingEmpty.title")}</EmptyTitle>
            <EmptyDescription>{t("matchingEmpty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" variant="outline" onClick={clearFilters}>
              {t("actions.clearFilters")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={isAdmin(user) ? "default" : "secondary"}>
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

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildPageHref(searchParams, currentPage - 1)}
                    aria-disabled={currentPage <= 1}
                    tabIndex={currentPage <= 1 ? -1 : undefined}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    text={t("pagination.previous")}
                  />
                </PaginationItem>

                {pageNumbers.map((page, i) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href={buildPageHref(searchParams, page)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href={buildPageHref(searchParams, currentPage + 1)}
                    aria-disabled={currentPage >= totalPages}
                    tabIndex={currentPage >= totalPages ? -1 : undefined}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    text={t("pagination.next")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
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
