import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const envPath = join(process.cwd(), "apps", "solivio", ".env.local");

if (existsSync(envPath)) {
  console.log("apps/solivio/.env.local already exists; leaving it unchanged.");
  process.exit(0);
}

mkdirSync(dirname(envPath), { recursive: true });

writeFileSync(
  envPath,
  [
    "DATABASE_URL=postgresql://solivio:solivio@localhost:5432/solivio",
    "DEFAULT_CURRENCY=PLN",
    "OPENAI_API_KEY=",
    "BETTER_AUTH_URL=http://localhost:3000",
    `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`,
    "AUTH_SIGNUP_ENABLED=true",
    "AUTH_CREDENTIALS_ENABLED=true",
    "AUTH_SSO_ENABLED=false",
    "AUTH_SIGNUP_DEFAULT_ROLE=admin",
    "",
  ].join("\n"),
);

console.log("Created apps/solivio/.env.local for local validation.");
