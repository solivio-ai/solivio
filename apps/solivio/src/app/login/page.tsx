import { LoginForm } from "./login-form";
import { BrandLockup } from "@/components/brand/BrandLockup";

export default function LoginPage() {
  const ssoEnabled = process.env.AUTH_SSO_ENABLED !== "false";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="grid w-full max-w-sm gap-6" aria-label="Solivio sign in">
        <BrandLockup href="/" tagline="Quotes shouldn’t take hours. They should start from your data." />
        <LoginForm
          credentialsEnabled={process.env.AUTH_CREDENTIALS_ENABLED !== "false"}
          signUpEnabled={process.env.AUTH_SIGNUP_ENABLED !== "false"}
          googleEnabled={ssoEnabled && !!process.env.AUTH_GOOGLE_CLIENT_ID}
          microsoftEnabled={ssoEnabled && !!process.env.AUTH_MICROSOFT_CLIENT_ID}
        />
      </section>
    </main>
  );
}
