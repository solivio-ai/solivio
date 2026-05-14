import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { UsersTable } from "@/features/admin-users";
import { auth } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminUsersPage");
  return { title: t("title") };
}

export default async function UsersPage() {
  const session = await getCurrentSession();
  const t = await getTranslations("AdminUsersPage");

  if (session?.user.role !== "admin") notFound();

  const result = await auth.api.listUsers({
    query: { limit: 500, sortBy: "createdAt", sortDirection: "desc" },
    headers: await headers(),
  });

  const users = result?.users ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("userCount", { count: users.length })}</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
