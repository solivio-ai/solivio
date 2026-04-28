import { demoProducts } from "@solivio/domain";
import { NextResponse } from "next/server";

import { productsResponseSchema } from "../../../server/api/contracts";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(productsResponseSchema.parse({
    products: demoProducts
  }));
}
