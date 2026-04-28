import { LoginForm } from "./login-form";

export default function LoginPage() {
  const ssoEnabled = process.env.AUTH_SSO_ENABLED !== "false";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginForm
        credentialsEnabled={process.env.AUTH_CREDENTIALS_ENABLED !== "false"}
        signUpEnabled={process.env.AUTH_SIGNUP_ENABLED !== "false"}
        googleEnabled={ssoEnabled && !!process.env.AUTH_GOOGLE_CLIENT_ID}
        microsoftEnabled={ssoEnabled && !!process.env.AUTH_MICROSOFT_CLIENT_ID}
      />
    </main>
  );
}
