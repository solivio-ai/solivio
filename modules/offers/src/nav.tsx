import { FileText, History, LayoutDashboard, Plus } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  { id: "offers.dashboard", href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, order: 0 },
  { id: "offers.list", href: "/offers", labelKey: "nav.offers", icon: FileText, order: 10 },
  { id: "offers.new", href: "/offers/new", labelKey: "nav.newOffer", icon: Plus, order: 11 },
  {
    id: "offers.orderUpload",
    href: "/admin/offers/upload",
    labelKey: "nav.orderUpload",
    icon: History,
    section: "admin",
    order: 35,
  },
];
