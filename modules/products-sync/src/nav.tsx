import { RefreshCw } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  {
    id: "products-sync.admin",
    href: "/admin/products-sync",
    labelKey: "nav.sync",
    icon: RefreshCw,
    section: "admin",
    order: 40,
  },
];
