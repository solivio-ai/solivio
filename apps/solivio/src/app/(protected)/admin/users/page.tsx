import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { UsersTable } from "@/features/admin-users";
import { auth } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminUsersPage");
  return { title: t("title") };
}

const PAGE_SIZE = 20;

type SortKey = "joinedDesc" | "joinedAsc" | "nameAsc" | "nameDesc";

function parseSortKey(value: string | undefined): SortKey {
  if (value === "joinedAsc" || value === "nameAsc" || value === "nameDesc") return value;
  return "joinedDesc";
}

function sortToAuthParams(sort: SortKey): { sortBy: string; sortDirection: "asc" | "desc" } {
  switch (sort) {
    case "joinedAsc":
      return { sortBy: "createdAt", sortDirection: "asc" };
    case "nameAsc":
      return { sortBy: "name", sortDirection: "asc" };
    case "nameDesc":
      return { sortBy: "name", sortDirection: "desc" };
    default:
      return { sortBy: "createdAt", sortDirection: "desc" };
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const role = params.role === "admin" || params.role === "user" ? params.role : "all";
  const sort = parseSortKey(typeof params.sort === "string" ? params.sort : undefined);

  const offset = (page - 1) * PAGE_SIZE;
  const { sortBy, sortDirection } = sortToAuthParams(sort);

  const session = await getCurrentSession();
  const t = await getTranslations("AdminUsersPage");

  const query: Record<string, unknown> = {
    limit: PAGE_SIZE,
    offset,
    sortBy,
    sortDirection,
  };

  if (search) {
    query.searchValue = search;
    query.searchOperator = "contains";
  }

  if (role !== "all") {
    query.filterField = "role";
    query.filterValue = role;
    query.filterOperator = "eq";
  }

  const result = await auth.api.listUsers({
    query,
    headers: await headers(),
  });

  const users = result?.users ?? [];
  const total = result?.total ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("userCount", { count: total })}</p>
      </div>
      <UsersTable
        users={users}
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        currentUserId={session?.user.id ?? ""}
      />
    </div>
  );
}
