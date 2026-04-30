"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

type Props = {
  initialMode: Mode;
  credentialsEnabled: boolean;
  signUpEnabled: boolean;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
};

type Mode = "signin" | "signup";

export function LoginForm({
  initialMode,
  credentialsEnabled,
  signUpEnabled,
  googleEnabled,
  microsoftEnabled,
}: Props) {
  const t = useTranslations("LoginForm");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isPending, startTransition] = useTransition();

  const hasSocial = googleEnabled || microsoftEnabled;
  const isSignIn = mode === "signin";
  const nextMode = isSignIn ? "signup" : "signin";
  const modeHref = nextMode === "signup" ? "/login?mode=signup" : "/login";
  const title = isSignIn ? t("title.signin") : t("title.signup");
  const submitLabel = isPending
    ? isSignIn
      ? t("actions.signingIn")
      : t("actions.creatingAccount")
    : isSignIn
      ? t("actions.signIn")
      : t("actions.signUp");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      if (isSignIn) {
        const identifier = String(form.get("identifier") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const isEmail = identifier.includes("@");

        const { error: signInError } = isEmail
          ? await signIn.email({ email: identifier, password, rememberMe })
          : await signIn.username({ username: identifier, password, rememberMe });

        if (signInError) {
          setError(t("errors.invalidCredentials"));
          return;
        }
      } else {
        const username = String(form.get("username") ?? "").trim();
        const { error: signUpError } = await signUp.email({
          name: username,
          username,
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });

        if (signUpError) {
          setError(t("errors.signUpFailed"));
          return;
        }
      }

      window.location.assign("/");
    });
  }

  return (
    <div className="flex w-full flex-col gap-5 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {credentialsEnabled && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {!isSignIn && (
            <Field htmlFor="username" label={t("fields.username")}>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                disabled={isPending}
              />
            </Field>
          )}

          {isSignIn ? (
            <Field htmlFor="identifier" label={t("fields.identifier")}>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                disabled={isPending}
              />
            </Field>
          ) : (
            <Field htmlFor="email" label={t("fields.email")}>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={isPending}
              />
            </Field>
          )}

          <Field htmlFor="password" label={t("fields.password")}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isSignIn ? "current-password" : "new-password"}
              disabled={isPending}
            />
          </Field>

          {isSignIn && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isPending}
                className="size-4 rounded border-input accent-primary"
              />
              {t("fields.rememberMe")}
            </label>
          )}

          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </form>
      )}

      {credentialsEnabled && signUpEnabled && (
        <p className="text-center text-sm text-muted-foreground">
          {isSignIn ? t("switch.noAccount") : t("switch.hasAccount")}{" "}
          <Link
            href={modeHref}
            onClick={(event) => {
              event.preventDefault();
              setMode(nextMode);
              setError(null);
            }}
            className="font-semibold text-primary hover:underline"
          >
            {isSignIn ? t("switch.signUp") : t("switch.signIn")}
          </Link>
        </p>
      )}

      {hasSocial && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("divider")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            {googleEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
              >
                {t("social.google")}
              </Button>
            )}
            {microsoftEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => signIn.social({ provider: "microsoft", callbackURL: "/" })}
              >
                {t("social.microsoft")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
