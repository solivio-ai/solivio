import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  plainErrorResponseSchema,
  productImportErrorResponseSchema,
  productImportRequestSchema,
  productImportResponseSchema,
} from "@/server/api/schemas";

export {
  plainErrorResponseSchema,
  productImportErrorResponseSchema,
  productImportRequestSchema,
  productImportResponseSchema,
};

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "importProducts",
    summary: "Import products with embeddings",
    description: "Admin only. Requires an authenticated session with the admin role.",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "CSV file contents to parse, embed, and upsert.",
      required: true,
      schema: productImportRequestSchema,
    },
    responses: {
      200: {
        description: "Number of products imported.",
        schema: productImportResponseSchema,
      },
      400: {
        description: "The import body was invalid.",
        schema: productImportErrorResponseSchema,
      },
      403: {
        description: "The current session is not allowed to import products.",
        schema: plainErrorResponseSchema,
      },
      413: {
        description: "The import payload exceeded the allowed size.",
        schema: plainErrorResponseSchema,
      },
      500: {
        description: "The import failed while embedding or writing products.",
        schema: productImportErrorResponseSchema,
      },
    },
  },
});
