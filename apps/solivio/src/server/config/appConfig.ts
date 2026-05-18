import "server-only";

export const appConfig = {
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? "PLN",
} as const;
