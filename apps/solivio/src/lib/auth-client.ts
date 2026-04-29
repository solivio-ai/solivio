import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

declare global {
  interface Window {
    __ENV?: { BETTER_AUTH_URL?: string };
  }
}

const baseURL =
  typeof window === "undefined"
    ? process.env.BETTER_AUTH_URL
    : window.__ENV?.BETTER_AUTH_URL || window.location.origin;

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
