import { Package } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  {
    id: "catalog.upload",
    href: "/admin/products/upload",
    labelKey: "nav.upload",
    icon: Package,
    section: "admin",
    order: 20,
  },
];
