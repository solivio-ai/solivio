import { demoProducts } from "@solivio/domain";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    products: demoProducts
  });
}
