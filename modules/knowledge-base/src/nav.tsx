import { BookOpen, Upload } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  {
    id: "knowledge-base.main",
    href: "/knowledge-base",
    labelKey: "nav.knowledgeBase",
    icon: BookOpen,
    order: 25,
  },
  {
    id: "knowledge-base.upload",
    href: "/admin/knowledge-base/upload",
    labelKey: "nav.upload",
    icon: Upload,
    section: "admin",
    order: 26,
  },
];
