import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { admin, username } from "better-auth/plugins";
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { externalSso } from "./external-sso-plugin.ts";

/**
 * These drive the real endpoints through `auth.handler`, rather than calling the
 * handler functions with a hand-built context. The security properties being
 * checked here - that a callback without a matching cookie is refused, that a
 * token missing `exp` is refused — only hold end to end, and a fake context is
 * exactly where such a check would silently stop being exercised.
 */

const BASE_URL = "http://localhost:3000";
const SECRET = "sso-shared-secret-sso-shared-secret";
const ISSUER = "odoo";
const AUDIENCE = "solivio-app";
const START_URL = "https://erp.example.test/solivio/sso/start";
const EXCHANGE_URL = "https://erp.example.test/solivio/api/sso/exchange";
const EXCHANGE_KEY = "exchange-api-key";

function createAuth() {
  const db = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth({
    database: memoryAdapter(db),
    baseURL: BASE_URL,
    secret: "test-better-auth-secret-test-better-auth",
    emailAndPassword: { enabled: true },
    plugins: [
      username(),
      admin({ defaultRole: "user" }),
      externalSso({
        secret: SECRET,
        issuer: ISSUER,
        audience: AUDIENCE,
        startUrl: START_URL,
        exchangeUrl: EXCHANGE_URL,
        exchangeKey: EXCHANGE_KEY,
        defaultRole: "user",
      }),
    ],
  });
  return { auth, db };
}

/** A token the issuer would return; overrides let each test break one thing. */
async function signIdToken(
  claims: Record<string, unknown> = {},
  options: { omit?: string[]; secret?: string } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: "7",
    email: "jan@paradise.test",
    name: "Jan Kowalski",
    jti: `jti-${Math.random().toString(36).slice(2)}`,
    ...claims,
  };
  for (const claim of options.omit ?? []) delete payload[claim];

  let token = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE);
  if (!options.omit?.includes("iat")) token = token.setIssuedAt(payload.iat as number | undefined);
  if (!options.omit?.includes("exp")) {
    token = token.setExpirationTime((payload.exp as number | undefined) ?? now + 120);
  }

  return token.sign(new TextEncoder().encode(options.secret ?? SECRET));
}

function stubExchange(idToken: string | null, status = 200) {
  const fetchMock = vi.fn(async () =>
    idToken === null
      ? new Response(JSON.stringify({ error: "nope" }), { status })
      : Response.json({ idToken }, { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Runs `/external-sso/start` and returns the state it minted plus the cookie. */
async function startFlow(auth: ReturnType<typeof createAuth>["auth"]) {
  const response = await auth.handler(new Request(`${BASE_URL}/api/auth/external-sso/start`));
  const setCookie = response.headers.get("set-cookie") ?? "";
  const state = new URL(response.headers.get("location") ?? BASE_URL).searchParams.get("state");
  // Only the name=value pair; the browser would not echo the attributes back.
  const cookie = setCookie.split(";")[0] ?? "";
  return { response, state, cookie };
}

function callback(
  auth: ReturnType<typeof createAuth>["auth"],
  params: { code?: string; state?: string },
  cookie?: string,
) {
  const url = new URL(`${BASE_URL}/api/auth/external-sso`);
  if (params.code !== undefined) url.searchParams.set("code", params.code);
  if (params.state !== undefined) url.searchParams.set("state", params.state);
  return auth.handler(new Request(url, { headers: cookie ? { cookie } : undefined }));
}

describe("external SSO — starting the flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("redirects to the issuer with a state parameter", async () => {
    const { auth } = createAuth();

    const { response, state } = await startFlow(auth);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")?.startsWith(START_URL)).toBe(true);
    expect(state).toBeTruthy();
  });

  test("stores state in a cookie the browser will send back from an iframe", async () => {
    const { auth } = createAuth();

    const { response } = await startFlow(auth);
    const setCookie = response.headers.get("set-cookie") ?? "";

    // HttpOnly so page scripts cannot read it; SameSite=None+Secure because the
    // callback lands in a cross-site iframe and a Lax cookie is not sent there.
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=None/i);
    expect(setCookie).toMatch(/Secure/i);
  });

  test("refuses to start when no issuer URL is configured", async () => {
    const auth = betterAuth({
      database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
      baseURL: BASE_URL,
      secret: "test-better-auth-secret-test-better-auth",
      plugins: [
        externalSso({
          secret: SECRET,
          issuer: ISSUER,
          audience: AUDIENCE,
          startUrl: undefined,
          exchangeUrl: undefined,
          exchangeKey: undefined,
          defaultRole: "user",
        }),
      ],
    });

    const response = await auth.handler(new Request(`${BASE_URL}/api/auth/external-sso/start`));

    expect(response.headers.get("location")).toContain("error=sso_not_configured");
  });
});

describe("external SSO — the callback", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("signs the user in and provisions them on first arrival", async () => {
    const { auth, db } = createAuth();
    const { state, cookie } = await startFlow(auth);
    const fetchMock = stubExchange(await signIdToken());

    const response = await callback(auth, { code: "one-time-code", state: state! }, cookie);

    expect(response.headers.get("location")).toBe("/");
    expect(response.headers.get("set-cookie")).toContain("session");
    expect(db.user).toHaveLength(1);
    expect(db.user[0]).toMatchObject({
      email: "jan@paradise.test",
      name: "Jan Kowalski",
      role: "user",
      // Asserted by the issuer, not self-reported.
      emailVerified: true,
    });

    // The code goes over the back channel, with the key, and never appears in
    // anything the browser can see.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EXCHANGE_URL);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${EXCHANGE_KEY}`);
    expect(JSON.parse(String(init.body))).toEqual({ code: "one-time-code" });
  });

  test("reuses the existing account on a later sign-in", async () => {
    const { auth, db } = createAuth();

    for (let i = 0; i < 2; i++) {
      const { state, cookie } = await startFlow(auth);
      stubExchange(await signIdToken());
      await callback(auth, { code: `code-${i}`, state: state! }, cookie);
    }

    expect(db.user).toHaveLength(1);
  });

  test("refuses a callback with no state cookie, before contacting the issuer", async () => {
    const { auth, db } = createAuth();
    const { state } = await startFlow(auth);
    const fetchMock = stubExchange(await signIdToken());

    const response = await callback(auth, { code: "one-time-code", state: state! });

    expect(response.headers.get("location")).toContain("error=sso_failed");
    // This is the login-CSRF defence: a callback the browser did not start is
    // rejected without the code ever being redeemed.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.user).toHaveLength(0);
  });

  test("refuses a state that does not match the cookie", async () => {
    const { auth } = createAuth();
    const { cookie } = await startFlow(auth);
    const fetchMock = stubExchange(await signIdToken());

    const response = await callback(
      auth,
      { code: "one-time-code", state: "not-the-state" },
      cookie,
    );

    expect(response.headers.get("location")).toContain("error=sso_failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("refuses an id token with no expiry", async () => {
    const { auth, db } = createAuth();
    const { state, cookie } = await startFlow(auth);
    // `jwtVerify` checks `exp` only when present, so without `requiredClaims`
    // this token would be accepted forever.
    stubExchange(await signIdToken({}, { omit: ["exp"] }));

    const response = await callback(auth, { code: "one-time-code", state: state! }, cookie);

    expect(response.headers.get("location")).toContain("error=sso_failed");
    expect(db.user).toHaveLength(0);
  });

  test("refuses an id token older than the maximum age", async () => {
    const { auth } = createAuth();
    const { state, cookie } = await startFlow(auth);
    const issued = Math.floor(Date.now() / 1000) - 600;
    // Still unexpired — a generous `exp` must not buy an unbounded replay window.
    stubExchange(await signIdToken({ iat: issued, exp: issued + 3600 }));

    const response = await callback(auth, { code: "one-time-code", state: state! }, cookie);

    expect(response.headers.get("location")).toContain("error=sso_failed");
  });

  test("refuses an id token signed with the wrong secret", async () => {
    const { auth } = createAuth();
    const { state, cookie } = await startFlow(auth);
    stubExchange(await signIdToken({}, { secret: "a-different-secret-a-different-secret" }));

    const response = await callback(auth, { code: "one-time-code", state: state! }, cookie);

    expect(response.headers.get("location")).toContain("error=sso_failed");
  });

  test("refuses the same id token twice", async () => {
    const { auth } = createAuth();
    const idToken = await signIdToken();

    const first = await startFlow(auth);
    stubExchange(idToken);
    const ok = await callback(auth, { code: "code-1", state: first.state! }, first.cookie);

    const second = await startFlow(auth);
    stubExchange(idToken);
    const replay = await callback(auth, { code: "code-2", state: second.state! }, second.cookie);

    expect(ok.headers.get("location")).toBe("/");
    expect(replay.headers.get("location")).toContain("error=sso_failed");
  });

  test("fails cleanly when the issuer refuses the code", async () => {
    const { auth, db } = createAuth();
    const { state, cookie } = await startFlow(auth);
    stubExchange(null, 400);

    const response = await callback(auth, { code: "already-spent", state: state! }, cookie);

    expect(response.headers.get("location")).toContain("error=sso_failed");
    expect(db.user).toHaveLength(0);
  });
});
