import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { authFlags } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-6 text-foreground">
      <section className="w-full max-w-sm" aria-label="Solivio sign in">
        <LoginForm
          credentialsEnabled={authFlags.credentialsEnabled}
          signUpEnabled={authFlags.signUpEnabled}
          googleEnabled={authFlags.googleEnabled}
          microsoftEnabled={authFlags.microsoftEnabled}
        />
      </section>
    </main>
  );
}
