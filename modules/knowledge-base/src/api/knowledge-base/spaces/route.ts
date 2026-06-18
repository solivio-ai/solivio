import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import { findAllSpaces, insertSpace } from "../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function GET() {
  await getAuth().requireAuth();
  const spaces = await findAllSpaces();
  return NextResponse.json(spaces);
}

export async function POST(request: Request) {
  await getAuth().requireAuth();
  const body = await request.json();
  const parsed = createSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const space = await insertSpace(parsed.data);
  return NextResponse.json(space, { status: 201 });
}
