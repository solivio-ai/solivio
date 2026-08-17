import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { jwtVerify } from "jose";
import { z } from "zod";

/**
 * SP-initiated SSO against an external identity source, in the shape of the
 * OIDC authorization-code flow:
 *
 * 1. `/external-sso/start` mints `state`, stores it in an HttpOnly cookie, and
 *    sends the browser to the issuer.
 * 2. The issuer authenticates the user itself, mints a **one-time opaque code**
 *    bound to that state, and sends the browser back to `/external-sso`.
 * 3. This server exchanges the code **server-to-server**, authenticating with a
 *    shared key, and receives a signed id token carrying the claims.
 *
 * Why not the simpler "issuer hands the browser a JWT" version this replaces:
 *
 * - **The browser never carries a usable credential.** A code lifted from
 *   browser history, a proxy log, or a copied URL is worthless without the
 *   exchange key, and it is consumed on first use. A JWT in a query string is
 *   the credential, and anyone holding it is that user.
 * - **`state` binds the callback to the browser that started the flow.** Without
 *   it, an attacker feeds a victim a callback URL for the attacker's own account
 *   and silently replaces the victim's session — login CSRF. This is inherent to
 *   IdP-initiated SSO, which is why the flow now starts here.
 *
 * The id token is verified even though it arrives over an authenticated
 * back-channel: it costs two lines and it means a misconfigured or intercepted
 * exchange endpoint cannot mint Solivio identities. OIDC does the same with
 * `id_token`.
 */

const STATE_COOKIE = "solivio.sso_state";
const STATE_BYTES = 32;
const STATE_TTL_SECONDS = 300;

const usernameFromEmail = (email: string) => {
  const local = email.split("@")[0] ?? "";
  const slug = local.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  return slug || "user";
};

/**
 * Ids of id tokens already redeemed, with the wall-clock time they stop being
 * replayable.
 *
 * Best-effort by design: the authoritative single-use guarantee is the issuer
 * consuming the *code*, which is durable and survives a restart. This catches
 * the narrower case of the same id token being presented twice, and being
 * per-process is acceptable for that — a replay would have to arrive at a
 * different instance, having first been read out of a server-to-server
 * response. Making it durable means a core table for a nonce; say so in a
 * review if the deployment ever runs many instances behind a load balancer.
 */
const redeemedTokenIds = new Map<string, number>();

function rememberTokenId(jti: string, expiresAtSeconds: number): boolean {
  const now = Date.now();
  for (const [id, expiry] of redeemedTokenIds) {
    if (expiry <= now) redeemedTokenIds.delete(id);
  }
  if (redeemedTokenIds.has(jti)) return false;
  redeemedTokenIds.set(jti, expiresAtSeconds * 1000);
  return true;
}

/** Constant-time compare of two values that may differ in length. */
function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type SsoClaims = { email: string; name: string };

/**
 * Verifies the issuer's id token.
 *
 * Returns null rather than throwing on any failure, so the caller can redirect
 * to a friendly error page instead of leaking a stack trace.
 *
 * `requiredClaims` is the point of this function: `jwtVerify` validates `exp`
 * only when it is *present*, so without it a token minted with no expiry is
 * accepted forever. The relying party must not depend on the issuer's manners.
 */
const verifyIdToken = async (
  token: string,
  secret: string,
  issuer: string,
  audience: string,
): Promise<SsoClaims | null> => {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience,
      algorithms: ["HS256"],
      // `jti` is required because it is what makes a redemption single-use.
      requiredClaims: ["exp", "iat", "jti"],
      // A handshake token is seconds old in the normal case. This caps replay
      // even if the issuer sets a generous `exp`.
      maxTokenAge: "2m",
      // Enough for ordinary NTP drift between two hosts, not enough to matter.
      clockTolerance: "30s",
    });

    if (typeof payload.email !== "string" || !payload.email) return null;
    if (typeof payload.jti !== "string" || typeof payload.exp !== "number") return null;
    if (!rememberTokenId(payload.jti, payload.exp)) return null;

    const name = typeof payload.name === "string" && payload.name ? payload.name : payload.email;
    return { email: payload.email, name };
  } catch {
    return null;
  }
};

/** Redeems a one-time code with the issuer and returns the id token it answers with. */
const exchangeCode = async (
  code: string,
  exchangeUrl: string,
  exchangeKey: string,
): Promise<string | null> => {
  try {
    const response = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exchangeKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ code }),
      // The user is waiting on a blank iframe; fail rather than hang.
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { idToken?: unknown };
    return typeof payload.idToken === "string" && payload.idToken ? payload.idToken : null;
  } catch {
    return null;
  }
};

type ExternalSsoOptions = {
  /** HS256 secret shared with the issuer. Undefined disables the endpoints. */
  secret: string | undefined;
  /** Expected `iss`. Undefined disables the endpoints, as an unset secret does. */
  issuer: string | undefined;
  /** Expected `aud`. */
  audience: string;
  /** Where `/external-sso/start` sends the browser to authenticate. */
  startUrl: string | undefined;
  /** Back-channel endpoint that trades a code for an id token. */
  exchangeUrl: string | undefined;
  /** Bearer key presented to {@link ExternalSsoOptions.exchangeUrl}. */
  exchangeKey: string | undefined;
  /** Role assigned to a Solivio user auto-created on first SSO login. */
  defaultRole: string;
};

/**
 * Cookie attributes for the state cookie.
 *
 * `sameSite: "none"` because the whole point is an embed: the callback arrives
 * in an iframe hosted by another site, and a Lax cookie would not be sent with
 * it. That forces `secure`, so this flow requires HTTPS everywhere except
 * localhost, which browsers treat as trustworthy.
 */
const stateCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: STATE_TTL_SECONDS,
} as const;

export const externalSso = (options: ExternalSsoOptions) => ({
  id: "external-sso",
  endpoints: {
    /**
     * Begins the flow. The iframe points here, not at the issuer, so that the
     * state cookie is set by the party that later has to verify it.
     */
    externalSsoStart: createAuthEndpoint("/external-sso/start", { method: "GET" }, async (ctx) => {
      if (!options.startUrl) throw ctx.redirect("/login?error=sso_not_configured");

      const state = randomBytes(STATE_BYTES).toString("base64url");
      ctx.setCookie(STATE_COOKIE, state, stateCookieOptions);

      const target = new URL(options.startUrl);
      target.searchParams.set("state", state);
      throw ctx.redirect(target.toString());
    }),

    externalSsoCallback: createAuthEndpoint(
      "/external-sso",
      { method: "GET", query: z.object({ code: z.string(), state: z.string() }) },
      async (ctx) => {
        // `throw`, not a bare call, at every check below: TS's unreachability
        // analysis for a custom never-returning helper doesn't reliably carry
        // narrowing across the `await`s in this handler, but a literal throw
        // always does.
        const failureRedirect = () => ctx.redirect("/login?error=sso_failed");

        if (!options.secret || !options.issuer) throw failureRedirect();
        if (!options.exchangeUrl || !options.exchangeKey) throw failureRedirect();
        const secret = options.secret;
        const issuer = options.issuer;

        // The state check comes first and costs nothing: a callback this browser
        // did not initiate is refused before we talk to the issuer at all.
        const expectedState = ctx.getCookie(STATE_COOKIE);
        if (!expectedState || !safeEquals(expectedState, ctx.query.state)) throw failureRedirect();
        // One flow per state, whatever happens next.
        ctx.setCookie(STATE_COOKIE, "", { ...stateCookieOptions, maxAge: 0 });

        const idToken = await exchangeCode(
          ctx.query.code,
          options.exchangeUrl,
          options.exchangeKey,
        );
        if (!idToken) throw failureRedirect();

        const claims = await verifyIdToken(idToken, secret, issuer, options.audience);
        if (!claims) throw failureRedirect();
        const { email, name } = claims;

        const existing = await ctx.context.internalAdapter.findUserByEmail(email);
        let user = existing?.user;

        if (!user) {
          let username = usernameFromEmail(email);
          // Collision check, not a hard guarantee: good enough for the rare
          // case of two different email local-parts slugifying the same way.
          for (let attempt = 0; attempt < 5; attempt++) {
            const taken = await ctx.context.adapter.findOne({
              model: "user",
              where: [{ field: "username", value: username }],
            });
            if (!taken) break;
            username = `${usernameFromEmail(email)}-${Math.random().toString(36).slice(2, 6)}`;
          }
          user = await ctx.context.internalAdapter.createUser({
            name,
            email,
            emailVerified: true, // asserted by the issuing system, not self-reported
            username,
            displayUsername: username,
            role: options.defaultRole,
          });
        }

        // No context argument: in better-auth 1.6 `createSession` takes
        // (userId, dontRememberMe, …) and the admin plugin's ban hook reads its
        // context from AsyncLocalStorage instead. Passing `ctx` here would bind
        // it to `dontRememberMe` and silently shorten every SSO session.
        const session = await ctx.context.internalAdapter.createSession(user.id);
        if (!session) throw failureRedirect();

        await setSessionCookie(ctx, { session, user });
        throw ctx.redirect("/");
      },
    ),
  },
});
