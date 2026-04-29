import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { authFlags } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="grid w-full max-w-sm gap-6" aria-label="Solivio sign in">
        <BrandLockup href="/" tagline="Quotes shouldn't take hours. They should start from your data." />
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
