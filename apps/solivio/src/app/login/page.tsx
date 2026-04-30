import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SolivioLogo } from "@/components/SolivioLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { authFlags } from "@/server/auth/auth";
import { getCurrentSession } from "@/server/auth/session";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    mode?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, t, params] = await Promise.all([
    getCurrentSession(),
    getTranslations("LoginPage"),
    searchParams,
  ]);
  if (session) redirect("/");

  const requestedMode = Array.isArray(params?.mode) ? params.mode[0] : params?.mode;
  const initialMode = authFlags.signUpEnabled && requestedMode === "signup" ? "signup" : "signin";

  return (
    <main className="relative grid min-h-screen place-items-center bg-background px-4 py-6 text-foreground">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher className="w-36 p-0 sm:w-40" />
        <ThemeToggle />
      </div>
      <section className="grid w-full max-w-sm gap-5" aria-label={t("sectionLabel")}>
        <div className="grid gap-2">
          <SolivioLogo
            width={180}
            height={60}
            sizes="180px"
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="text-sm leading-tight text-muted-foreground">{t("tagline")}</span>
        </div>
        <LoginForm
          initialMode={initialMode}
          credentialsEnabled={authFlags.credentialsEnabled}
          signUpEnabled={authFlags.signUpEnabled}
          googleEnabled={authFlags.googleEnabled}
          microsoftEnabled={authFlags.microsoftEnabled}
        />
      </section>
    </main>
  );
}
