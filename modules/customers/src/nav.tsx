import { Building2 } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  {
    id: "customers.upload",
    href: "/admin/customers/upload",
    labelKey: "nav.upload",
    icon: Building2,
    section: "admin",
    order: 30,
  },
];
