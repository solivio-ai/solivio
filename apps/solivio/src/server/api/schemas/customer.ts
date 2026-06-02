import { z } from "zod";

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
