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
  const customerText = body.customerText?.trim() || demoRequest.text;

  return NextResponse.json(
    customerRequestResponseSchema.parse({
      request: {
        ...demoRequest,
        id: `request-${Date.now()}`,
        customerName: body.customerName?.trim() || demoRequest.customerName,
        text: customerText,
        requirements: extractMockRequirements(customerText),
      },
    }),
    { status: 201 },
  );
}

function extractMockRequirements(text: string) {
  const normalized = text.toLowerCase();
  const requirements = [
    normalized.includes("battery") || normalized.includes("storage")
      ? "battery storage"
      : undefined,
    normalized.includes("monitor") ? "energy monitoring" : undefined,
    normalized.includes("office") ? "small commercial installation" : undefined,
    normalized.includes("solar") || normalized.includes("photovoltaic")
      ? "photovoltaic panels"
      : undefined,
  ].filter((requirement): requirement is string => Boolean(requirement));

  return requirements.length > 0 ? requirements : demoRequest.requirements;
}
