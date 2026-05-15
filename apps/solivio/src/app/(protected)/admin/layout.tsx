import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentSession } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (session?.user.role !== "admin") notFound();
  return <>{children}</>;
}
