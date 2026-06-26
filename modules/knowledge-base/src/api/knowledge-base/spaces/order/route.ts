import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import { updateSpaceSortOrders } from "../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

const schema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

export async function PATCH(request: Request) {
  await getAuth().requireAuth();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await updateSpaceSortOrders(parsed.data.order);
  return new NextResponse(null, { status: 204 });
}
