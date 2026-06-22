import { NextResponse } from "next/server";

import { enqueueJob, getAuth, getImporter } from "@solivio/sdk/runtime";

import type { ImportPayload } from "../../../lib/importSchema.ts";
import { createImportRun, listImportRuns } from "../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { response: authResponse } = await getAuth().requireAdmin();
  if (authResponse) return authResponse;
  const runs = await listImportRuns(20);
  return NextResponse.json({ runs });
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const { response: authResponse } = await getAuth().requireAdmin();
  if (authResponse) return authResponse;

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Request body must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  try {
    const body = await request.json();
    const content = body?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'content' string." },
        { status: 400 },
      );
    }

    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: `Content must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.` },
        { status: 413 },
      );
    }

    const importer = await getImporter("knowledge-base");
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json({ error: "Import failed.", errors: result.errors }, { status: 400 });
    }

    const payload = result.records[0] as ImportPayload;
    const run = await createImportRun(payload.origin);
    await enqueueJob("knowledge-base.import", {
      payloadJson: JSON.stringify(payload),
      runId: run.id,
    });

    return NextResponse.json(
      { queued: true, spaces: payload.spaces.length, runId: run.id },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
