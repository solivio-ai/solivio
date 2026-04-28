import { betterAuth } from "better-auth";
import type { SocialProviders } from "better-auth/social-providers";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "@/server/database/db";
import * as schema from "@/server/database/schema";

const credentialsEnabled = process.env.AUTH_CREDENTIALS_ENABLED !== "false";
const ssoEnabled = process.env.AUTH_SSO_ENABLED !== "false";
const signUpEnabled = process.env.AUTH_SIGNUP_ENABLED !== "false";

const socialProviders: SocialProviders = {};

if (ssoEnabled && process.env.AUTH_GOOGLE_CLIENT_ID) {
  socialProviders.google = {
    clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET ?? "",
  };
}

if (ssoEnabled && process.env.AUTH_MICROSOFT_CLIENT_ID) {
  socialProviders.microsoft = {
    clientId: process.env.AUTH_MICROSOFT_CLIENT_ID,
    clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET ?? "",
    tenantId: process.env.AUTH_MICROSOFT_TENANT_ID ?? "common",
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: credentialsEnabled,
    disableSignUp: !signUpEnabled,
  },
  socialProviders,
  plugins: [nextCookies(), username()],
});

export type Session = typeof auth.$Infer.Session;
