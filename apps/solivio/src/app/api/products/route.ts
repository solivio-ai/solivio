import { NextResponse } from "next/server";

import { demoProducts } from "@solivio/domain";
import { productsResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  return NextResponse.json(
    productsResponseSchema.parse({
      products: demoProducts,
    }),
  );
}
