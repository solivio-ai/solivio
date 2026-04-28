import { demoRequest } from "@solivio/domain";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type RequestInput = {
  customerName?: string;
  customerText?: string;
};

export function GET() {
  return NextResponse.json({
    request: demoRequest
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RequestInput;
  const customerText = body.customerText?.trim() || demoRequest.text;

  return NextResponse.json(
    {
      request: {
        ...demoRequest,
        id: `request-${Date.now()}`,
        customerName: body.customerName?.trim() || demoRequest.customerName,
        text: customerText,
        requirements: extractMockRequirements(customerText)
      }
    },
    { status: 201 }
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
      : undefined
  ].filter((requirement): requirement is string => Boolean(requirement));

  return requirements.length > 0 ? requirements : demoRequest.requirements;
}
