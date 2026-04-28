async function authHandlers() {
  const [{ auth }, { toNextJsHandler }] = await Promise.all([
    import("@/lib/auth"),
    import("better-auth/next-js"),
  ]);

  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  const handlers = await authHandlers();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await authHandlers();
  return handlers.POST(request);
}
