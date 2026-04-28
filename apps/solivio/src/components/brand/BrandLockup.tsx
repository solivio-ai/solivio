import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandLockupProps = {
  className?: string;
  href?: string;
  tagline?: string;
};

export function BrandLockup({ className, href = "/", tagline }: BrandLockupProps) {
  const content = (
    <span className="grid min-w-0 gap-2">
      <Image
        src="/solivio-logo.png"
        alt="Solivio"
        width={180}
        height={60}
        sizes="(min-width: 640px) 180px, 150px"
        className="h-10 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-[180px]"
      />
      {tagline ? <span className="text-sm leading-tight text-muted-foreground">{tagline}</span> : null}
    </span>
  );

  const classes = cn("inline-grid min-w-0 text-left no-underline", className);

  if (!href) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={href} className={classes} aria-label="Solivio home">
      {content}
    </Link>
  );
}
