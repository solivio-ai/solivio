import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { db } from "@/server/database/db";
import { account, session, user, verification } from "@/server/database/schema";

const flag = (name: string, fallback: boolean) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value !== "false";
};

export const authFlags = {
  credentialsEnabled: flag("AUTH_CREDENTIALS_ENABLED", true),
  ssoEnabled: flag("AUTH_SSO_ENABLED", true),
  signUpEnabled: flag("AUTH_SIGNUP_ENABLED", true),
  googleEnabled: flag("AUTH_SSO_ENABLED", true) && !!process.env.AUTH_GOOGLE_CLIENT_ID,
  microsoftEnabled: flag("AUTH_SSO_ENABLED", true) && !!process.env.AUTH_MICROSOFT_CLIENT_ID,
} as const;

const socialProviders: NonNullable<Parameters<typeof betterAuth>[0]["socialProviders"]> = {};

if (authFlags.googleEnabled) {
  socialProviders.google = {
    clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
    clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET ?? "",
  };
}

if (authFlags.microsoftEnabled) {
  socialProviders.microsoft = {
    clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET ?? "",
    tenantId: process.env.AUTH_MICROSOFT_TENANT_ID ?? "common",
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: authFlags.credentialsEnabled,
    disableSignUp: !authFlags.signUpEnabled,
  },
  socialProviders,
  plugins: [nextCookies(), username()],
});

export type Session = typeof auth.$Infer.Session;
