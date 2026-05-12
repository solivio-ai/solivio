import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { demoRequest } from "@solivio/domain";
import {
  createCustomerRequestRequestSchema,
  customerRequestResponseSchema,
} from "@/server/api/contracts";
import { apiError } from "@/server/api/errors";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  return NextResponse.json(
    customerRequestResponseSchema.parse({
      request: demoRequest,
    }),
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const json = await request.json().catch(() => ({}));
  const input = createCustomerRequestRequestSchema.safeParse(json);

  if (!input.success) {
    return NextResponse.json(
      apiError(
        "invalid_request",
        "Request body must match the customer request contract.",
        input.error.issues.map((issue) => issue.message),
      ),
      { status: 400 },
    );
  }

  const body = input.data;
  const rawText = body.customerText?.trim() || demoRequest.rawText;

  return NextResponse.json(
    customerRequestResponseSchema.parse({
      request: {
        ...demoRequest,
        id: `request-${Date.now()}`,
        customerId: demoRequest.customerId,
        rawText,
        source: "manual",
      },
    }),
    { status: 201 },
  );
}
