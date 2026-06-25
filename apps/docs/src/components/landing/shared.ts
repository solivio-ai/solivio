import type { LandingContent } from "../../landing/content";

export type Link = {
  href: string;
  label: string;
  external?: boolean;
};

export type LandingLabels = LandingContent["labels"];

export const releaseLabel = "v0.1.0";

export const linkAttrs = (link: Link) =>
  link.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

const buttonBaseClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px";

export const ui = {
  buttonBaseClass,
  buttonPrimaryClass: `${buttonBaseClass} bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(246,194,21,0.28)] hover:bg-primary/85`,
  buttonDarkClass: `${buttonBaseClass} bg-foreground text-background hover:bg-foreground/85`,
  buttonOutlineClass: `${buttonBaseClass} border-border bg-background text-foreground hover:bg-muted`,
  cardClass:
    "rounded-lg border border-border bg-card text-card-foreground shadow-[0_20px_70px_rgba(16,32,29,0.07)]",
  flatCardClass: "rounded-lg border border-border bg-background",
  sectionClass: "relative border-t border-border px-4 py-16 sm:px-6 lg:px-14 lg:py-24",
  sectionHeaderClass: "mx-auto grid max-w-3xl gap-3 text-center",
  sectionLabelClass:
    "text-xs font-semibold uppercase tracking-[0.18em] text-secondary dark:text-primary",
  sectionTitleClass:
    "text-balance text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-5xl",
  sectionLeadClass: "text-base leading-7 text-muted-foreground sm:text-lg",
  h3Class: "text-base font-semibold leading-6 text-foreground",
  bodyTextClass: "text-sm leading-6 text-muted-foreground",
  textLinkClass:
    "inline-flex items-center gap-1.5 text-sm font-semibold text-secondary underline-offset-4 transition-colors hover:underline dark:text-primary",
  iconTileClass:
    "flex size-10 shrink-0 items-center justify-center rounded-lg border border-secondary/20 bg-accent text-secondary dark:border-primary/25 dark:bg-primary/10 dark:text-primary",
} as const;
