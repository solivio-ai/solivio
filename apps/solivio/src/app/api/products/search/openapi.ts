import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  productSearchRequestSchema,
  productSearchResponseSchema,
} from "@/server/api/schemas";

export { errorResponseSchema, productSearchRequestSchema, productSearchResponseSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "searchProducts",
    summary: "Search products from a prompt",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Prompt used for semantic product matching against embedded products.",
      required: true,
      schema: productSearchRequestSchema,
    },
    responses: {
      200: {
        description: "Semantic matches from the products table with an AI summary.",
        schema: productSearchResponseSchema,
      },
      400: "The request body could not be parsed or validated.",
      500: "The server could not complete the semantic product search.",
    },
  },
});
