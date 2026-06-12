import Image, { type ImageProps } from "next/image";

import { cn } from "@solivio/ui/lib/utils.ts";

type SolivioLogoProps = Omit<ImageProps, "alt" | "src"> & {
  alt?: string;
};

export function SolivioLogo({ alt = "Solivio", className, ...props }: SolivioLogoProps) {
  return (
    <>
      <Image
        src="/solivio-logo.png"
        alt={alt}
        className={cn("dark:hidden", className)}
        unoptimized
        {...props}
      />
      <Image
        src="/solivio-logo-dark.png"
        alt={alt}
        className={cn("hidden dark:block", className)}
        unoptimized
        {...props}
      />
    </>
  );
}
