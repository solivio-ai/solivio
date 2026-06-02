import { z } from "zod";

import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  createCustomerRequestSchema,
  customerResponseSchema,
  customersResponseSchema,
  errorResponseSchema,
} from "@/server/api/schemas";

export {
  createCustomerRequestSchema,
  customerResponseSchema,
  customersResponseSchema,
  errorResponseSchema,
};

export const customerSearchQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(50).optional(),
    q: z.string().optional(),
    query: z.string().optional(),
  })
  .strict()
  .meta({
    id: "CustomerSearchQuery",
    description: "Optional customer search query and result limit.",
  });

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "searchCustomers",
    summary: "Search customers",
    tags: ["Customers"],
    requiresAuth: true,
    requestQuery: customerSearchQuerySchema,
    responses: {
      200: {
        description: "Customers matching the query.",
        schema: customersResponseSchema,
      },
      400: "The customer search query was invalid.",
    },
  },
  POST: {
    operationId: "createCustomer",
    summary: "Create or reuse a customer",
    tags: ["Customers"],
    requiresAuth: true,
    requestBody: {
      description: "Customer display name.",
      required: true,
      schema: createCustomerRequestSchema,
    },
    responses: {
      201: {
        description: "The created or existing customer.",
        schema: customerResponseSchema,
      },
      400: "The request body could not be parsed or validated.",
    },
  },
});
