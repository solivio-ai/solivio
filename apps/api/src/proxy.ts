import { NextResponse, type NextRequest } from "next/server";

const defaultAllowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response =
    request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

  applyCorsHeaders(response, origin);

  return response;
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.append("Vary", "Origin");
}

function getAllowedOrigins() {
  return (process.env.API_ALLOWED_ORIGINS ?? defaultAllowedOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config = {
  matcher: "/api/:path*"
};
