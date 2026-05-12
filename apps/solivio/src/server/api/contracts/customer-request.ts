import { z } from "zod";

export const customerRequestSourceSchema = z.string().meta({ id: "CustomerRequestSource" });

export const customerRequestSchema = z
  .object({
    id: z.string().meta({ examples: ["request-demo-001"] }),
    customerId: z.string().nullable(),
    rawText: z.string(),
    source: customerRequestSourceSchema,
  })
  .strict()
  .meta({
    id: "CustomerRequest",
    description: "Raw customer request captured at intake.",
  });

export const createCustomerRequestRequestSchema = z
  .object({
    customerName: z.string().optional(),
    customerText: z.string().optional(),
  })
  .strict()
  .meta({
    id: "CreateCustomerRequestRequest",
    description: "Draft request input accepted by the mocked intake boundary.",
  });

export const customerRequestResponseSchema = z
  .object({
    request: customerRequestSchema,
  })
  .strict()
  .meta({ id: "CustomerRequestResponse" });
