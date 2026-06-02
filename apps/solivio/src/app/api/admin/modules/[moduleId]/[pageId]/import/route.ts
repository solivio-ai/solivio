import { NextResponse } from "next/server";

import type { CustomerInput, ImporterDefinition, ImportTarget, ProductInput } from "@solivio/sdk";
import { requireAdmin } from "@/server/auth/session";
import { importCustomers } from "@/server/customers/customerImportService";
import { getModuleImporter, getModuleUiPage } from "@/server/modules/registry";
import { importProductsWithEmbeddings } from "@/server/products/productEmbeddingService";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BODY_BYTES_BY_TARGET = {
  customer: 10 * 1024 * 1024,
  product: 25 * 1024 * 1024,
} satisfies Record<ImportTarget, number>;

type ModuleImportRouteContext = {
  params: Promise<{
    moduleId: string;
    pageId: string;
  }>;
};

export async function POST(request: Request, context: ModuleImportRouteContext) {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const { moduleId, pageId } = await context.params;
  const page = await getModuleUiPage(moduleId, pageId);
  if (!page || page.kind !== "client-island" || !page.importerName || !page.target) {
    return NextResponse.json({ error: "Module import page was not found." }, { status: 404 });
  }

  const importer = (await getModuleImporter(
    page.moduleId,
    page.importerName,
    page.target,
  )) as ImporterDefinition<unknown, unknown>;
  const maxBodyBytes = MAX_BODY_BYTES_BY_TARGET[page.target];

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > maxBodyBytes) {
    return NextResponse.json(
      { error: `Request body must not exceed ${maxBodyBytes / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const content = body?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'content' string." },
        { status: 400 },
      );
    }

    if (Buffer.byteLength(content, "utf8") > maxBodyBytes) {
      return NextResponse.json(
        { error: `Content must not exceed ${maxBodyBytes / 1024 / 1024} MB.` },
        { status: 413 },
      );
    }

    const result = await importer.run(content);
    if (result.status === "failed") {
      return NextResponse.json({ error: "Import failed.", errors: result.errors }, { status: 400 });
    }

    if (page.target === "product") {
      const { count } = await importProductsWithEmbeddings(result.records as ProductInput[]);
      return NextResponse.json({ count, errors: result.errors });
    }

    const imported = await importCustomers(result.records as CustomerInput[]);
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
