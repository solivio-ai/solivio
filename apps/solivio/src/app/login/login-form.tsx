"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

type Props = {
  credentialsEnabled: boolean;
  signUpEnabled: boolean;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
};

type Mode = "signin" | "signup";

export function LoginForm({
  credentialsEnabled,
  signUpEnabled,
  googleEnabled,
  microsoftEnabled,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSocial = googleEnabled || microsoftEnabled;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      if (mode === "signin") {
        const identifier = String(form.get("identifier") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const isEmail = identifier.includes("@");

        const { error: signInError } = isEmail
          ? await signIn.email({ email: identifier, password, callbackURL: "/" })
          : await signIn.username({ username: identifier, password });

        if (signInError) {
          setError("Invalid credentials.");
          return;
        }
      } else {
        const username = String(form.get("username") ?? "").trim();
        const { error: signUpError } = await signUp.email({
          name: username,
          username,
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          callbackURL: "/",
        });

        if (signUpError) {
          setError(signUpError.message ?? "Sign up failed.");
          return;
        }
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
      <header>
        <p className="mb-1 text-xs font-semibold tracking-widest text-primary uppercase">Solivio</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {credentialsEnabled && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <Field htmlFor="username" label="Username">
              <Input id="username" name="username" type="text" required autoComplete="username" disabled={isPending} />
            </Field>
          )}

          {mode === "signin" ? (
            <Field htmlFor="identifier" label="Email or username">
              <Input id="identifier" name="identifier" type="text" required autoComplete="username" disabled={isPending} />
            </Field>
          ) : (
            <Field htmlFor="email" label="Email">
              <Input id="email" name="email" type="email" required autoComplete="email" disabled={isPending} />
            </Field>
          )}

          <Field htmlFor="password" label="Password">
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              disabled={isPending}
            />
          </Field>

          <Button type="submit" disabled={isPending} className="mt-1">
            {isPending
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      )}

      {credentialsEnabled && signUpEnabled && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      )}

      {hasSocial && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            {googleEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
              >
                Continue with Google
              </Button>
            )}
            {microsoftEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => signIn.social({ provider: "microsoft", callbackURL: "/" })}
              >
                Continue with Microsoft
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
