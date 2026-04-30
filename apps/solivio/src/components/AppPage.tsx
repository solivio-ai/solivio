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
        "w-full min-w-0 px-3 pt-14 sm:px-4 sm:pt-4 lg:px-5",
        fullHeight ? "grid h-svh min-h-0 pb-0" : "grid gap-4 pb-3",
        className,
      )}
    >
      {children}
    </section>
  );
}
