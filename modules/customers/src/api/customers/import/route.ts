import { NextResponse } from "next/server";

import { getAuth, getImporter } from "@solivio/sdk/runtime";

import { customerImportRequestSchema } from "../../../contracts/customer.ts";
import { importCustomers } from "../../../server/customerImportService.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

/** ~10 MB — enough for large customer lists while blocking runaway payloads. */
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
    const body = customerImportRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'content' string." },
        { status: 400 },
      );
    }

    const { content } = body.data;
    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: `Content must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.` },
        { status: 413 },
      );
    }

    const importer = await getImporter("customer");
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json({ error: "Import failed.", errors: result.errors }, { status: 400 });
    }

    const imported = await importCustomers(result.records);
    const errors = [...result.errors, ...imported.errors];

    if (imported.count === 0 && errors.length > 0) {
      return NextResponse.json({ error: "Import failed.", errors }, { status: 400 });
    }

    return NextResponse.json({ count: imported.count, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
