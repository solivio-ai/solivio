import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export type User = typeof authClient.$Infer.Session.user;
