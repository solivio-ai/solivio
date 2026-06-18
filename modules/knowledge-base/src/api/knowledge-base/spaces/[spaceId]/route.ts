import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import {
  deleteSpace,
  findSpaceById,
  updateSpace,
} from "../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ spaceId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { spaceId } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const space = await updateSpace(spaceId, parsed.data);
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(space);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { spaceId } = await params;
  const space = await findSpaceById(spaceId);
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteSpace(spaceId);
  return new NextResponse(null, { status: 204 });
}
