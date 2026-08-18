import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";

import { db } from "@/server/database/db";
import { accounts, sessions, users, verifications } from "@/server/database/schema";

import { externalSso } from "./external-sso-plugin";

const flag = (name: string, fallback: boolean) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value !== "false";
};

// Hides Change Password / Log Out in the app's own user menu for users who
// arrive via external SSO. Independent of AUTH_CREDENTIALS_ENABLED: /login
// stays reachable and the credentials form still works there, so an admin
// can sign in directly without going through SSO.
const ssoOnly = flag("AUTH_SSO_ONLY", false);

export const authFlags = {
  credentialsEnabled: flag("AUTH_CREDENTIALS_ENABLED", true),
  ssoEnabled: flag("AUTH_SSO_ENABLED", true),
  ssoOnly,
  signUpEnabled: flag("AUTH_SIGNUP_ENABLED", true),
  signUpDefaultRole: process.env.AUTH_SIGNUP_DEFAULT_ROLE ?? "user",
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
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: authFlags.credentialsEnabled,
    disableSignUp: !authFlags.signUpEnabled,
  },
  socialProviders,
  plugins: [
    nextCookies(),
    username(),
    admin({
      defaultRole: authFlags.signUpDefaultRole,
    }),
    externalSso({
      secret: process.env.SSO_JWT_SECRET,
      issuer: process.env.SSO_JWT_ISSUER,
      audience: process.env.SSO_JWT_AUDIENCE ?? "solivio-app",
      // Where the browser goes to authenticate, and the back channel this
      // server redeems the returned code on. Both point at the same external
      // system; they are separate settings because only the second one carries
      // a secret, and only the first is ever seen by a browser.
      startUrl: process.env.SSO_START_URL,
      exchangeUrl: process.env.SSO_EXCHANGE_URL,
      exchangeKey: process.env.SSO_EXCHANGE_API_KEY,
      defaultRole: authFlags.signUpDefaultRole,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
