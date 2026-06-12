import { z } from "zod";

import { routeGroup } from "@solivio/sdk/contracts";

export const customerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    source: z.string(),
  })
  .strict()
  .meta({ id: "Customer", description: "A customer available for offer assignment." });

export const customersResponseSchema = z
  .object({
    customers: z.array(customerSchema),
  })
  .strict()
  .meta({ id: "CustomersResponse" });

export const createCustomerRequestSchema = z
  .object({
    name: z.string().trim().min(1),
    source: z.string().trim().min(1).optional(),
  })
  .strict()
  .meta({ id: "CreateCustomerRequest" });

export const customerResponseSchema = z
  .object({
    customer: customerSchema,
  })
  .strict()
  .meta({ id: "CustomerResponse" });

export const customerImportRequestSchema = z
  .object({
    content: z.string().min(1),
  })
  .strict()
  .meta({
    id: "CustomerImportRequest",
    description: "CSV file contents for customer import.",
  });

export const customerImportRowErrorSchema = z
  .object({
    index: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
    message: z.string(),
  })
  .strict()
  .meta({ id: "CustomerImportRowError" });

export const customerImportResponseSchema = z
  .object({
    count: z.number().int().nonnegative(),
    errors: z.array(customerImportRowErrorSchema),
  })
  .strict()
  .meta({ id: "CustomerImportResponse" });

export const customerImportErrorResponseSchema = z
  .object({
    error: z.string(),
    errors: z.array(customerImportRowErrorSchema).optional(),
  })
  .strict()
  .meta({ id: "CustomerImportErrorResponse" });

export const customerRoutes = [
  ...routeGroup({ tag: "Customers", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/customers",
      operationId: "searchCustomers",
      summary: "Search customers",
      responses: {
        200: {
          description: "Customers matching the query.",
          schema: customersResponseSchema,
        },
      },
    },
    {
      method: "post",
      path: "/api/customers",
      operationId: "createCustomer",
      summary: "Create or reuse a customer",
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
  ]),
  ...routeGroup({ tag: "Customers", requiresAuth: true }, [
    {
      method: "post",
      path: "/api/customers/import",
      operationId: "importCustomers",
      summary: "Import customers",
      description: "Admin only. Requires an authenticated session with the admin role.",
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
        500: {
          description: "The import failed while writing customers.",
          schema: customerImportErrorResponseSchema,
        },
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
