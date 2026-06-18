import { BookOpen } from "lucide-react";

import type { NavEntry } from "@solivio/sdk";

export const nav: NavEntry[] = [
  {
    id: "knowledge-base.main",
    href: "/knowledge-base",
    labelKey: "nav.knowledgeBase",
    icon: BookOpen,
    order: 25,
  },
];
