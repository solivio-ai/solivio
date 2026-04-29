import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { SolivioLogo } from "@/components/SolivioLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { authFlags } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <main className="relative grid min-h-screen place-items-center bg-background px-4 py-6 text-foreground">
      <ThemeToggle className="absolute right-4 top-4" />
      <section className="grid w-full max-w-sm gap-5" aria-label="Solivio sign in">
        <Link href="/" className="grid gap-2 no-underline" aria-label="Solivio home">
          <SolivioLogo
            width={180}
            height={60}
            sizes="180px"
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="text-sm leading-tight text-muted-foreground">
            Quotes shouldn&apos;t take hours. They should start from your data.
          </span>
        </Link>
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
