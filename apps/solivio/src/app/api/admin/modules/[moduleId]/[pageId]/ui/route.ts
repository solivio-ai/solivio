import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/session";
import { getModuleUiPageAsset } from "@/server/modules/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModuleUiAssetRouteContext = {
  params: Promise<{
    moduleId: string;
    pageId: string;
  }>;
};

export async function GET(_request: Request, context: ModuleUiAssetRouteContext) {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const { moduleId, pageId } = await context.params;
  const asset = await getModuleUiPageAsset(moduleId, pageId);
  if (!asset)
    return NextResponse.json({ error: "Module UI asset was not found." }, { status: 404 });

  try {
    const source = await readFile(asset.filePath, "utf8");
    return new Response(source, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/javascript; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
