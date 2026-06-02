import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  customerImportErrorResponseSchema,
  customerImportRequestSchema,
  customerImportResponseSchema,
  plainErrorResponseSchema,
} from "@/server/api/schemas";

export {
  customerImportErrorResponseSchema,
  customerImportRequestSchema,
  customerImportResponseSchema,
  plainErrorResponseSchema,
};

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "importCustomers",
    summary: "Import customers",
    description: "Admin only. Requires an authenticated session with the admin role.",
    tags: ["Customers"],
    requiresAuth: true,
    requestBody: {
      description: "CSV file contents to parse and upsert.",
      required: true,
      schema: customerImportRequestSchema,
    },
    responses: {
      200: {
        description: "Number of customers imported.",
        schema: customerImportResponseSchema,
      },
      400: {
        description: "The import body was invalid.",
        schema: customerImportErrorResponseSchema,
      },
      403: {
        description: "The current session is not allowed to import customers.",
        schema: plainErrorResponseSchema,
      },
      413: {
        description: "The import payload exceeded the allowed size.",
        schema: plainErrorResponseSchema,
      },
      500: {
        description: "The import failed while writing customers.",
        schema: customerImportErrorResponseSchema,
      },
    },
  },
});
