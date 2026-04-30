import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppPageProps = {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
};

export function AppPage({ children, className, fullHeight = false }: AppPageProps) {
  return (
    <section
      className={cn(
        "w-full min-w-0 px-3 py-3 sm:px-4 lg:px-5",
        fullHeight ? "grid h-[calc(100svh-2.25rem)] min-h-0" : "grid gap-4",
        className
      )}
    >
      {children}
    </section>
  );
}
