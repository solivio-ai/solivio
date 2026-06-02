import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import { importCustomers } from "@/server/customers/customerImportService";
import { getImporter } from "@/server/modules/registry";

import {
  customerImportErrorResponseSchema,
  customerImportRequestSchema,
  customerImportResponseSchema,
  plainErrorResponseSchema,
} from "./openapi";

export const runtime = "nodejs";
export const maxDuration = 300;

/** ~10 MB — enough for large customer lists while blocking runaway payloads. */
const MAX_BODY_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      plainErrorResponseSchema.parse({
        error: `Request body must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.`,
      }),
      { status: 413 },
    );
  }

  try {
    const body = customerImportRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        customerImportErrorResponseSchema.parse({
          error: "Body must include a non-empty 'content' string.",
        }),
        { status: 400 },
      );
    }

    const { content } = body.data;
    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        plainErrorResponseSchema.parse({
          error: `Content must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.`,
        }),
        { status: 413 },
      );
    }

    const importer = await getImporter("customer");
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json(
        customerImportErrorResponseSchema.parse({
          error: "Import failed.",
          errors: result.errors,
        }),
        { status: 400 },
      );
    }

    const imported = await importCustomers(result.records);
    const errors = [...result.errors, ...imported.errors];

    if (imported.count === 0 && errors.length > 0) {
      return NextResponse.json(
        customerImportErrorResponseSchema.parse({ error: "Import failed.", errors }),
        { status: 400 },
      );
    }

    return NextResponse.json(customerImportResponseSchema.parse({ count: imported.count, errors }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(customerImportErrorResponseSchema.parse({ error: message }), {
      status: 500,
    });
  }
}
