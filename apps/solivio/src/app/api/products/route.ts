import { demoProducts } from "@solivio/domain";
import { NextResponse } from "next/server";

import { productsResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  return NextResponse.json(productsResponseSchema.parse({
    products: demoProducts
  }));
}
