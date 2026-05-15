import { z } from "zod";

import { routeGroup } from "./common";

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

export const requestRoutes = [
  ...routeGroup({ tag: "Requests", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/requests",
      operationId: "getDemoRequest",
      summary: "Get the demo customer request",
      responses: {
        200: {
          description: "The current mocked request and extracted requirements.",
          schema: customerRequestResponseSchema,
        },
      },
    },
    {
      method: "post",
      path: "/api/requests",
      operationId: "createCustomerRequest",
      summary: "Create a draft customer request",
      requestBody: {
        description: "Raw customer request text for mocked requirement extraction.",
        required: false,
        schema: createCustomerRequestRequestSchema,
      },
      responses: {
        201: {
          description: "A mocked request object with extracted requirements.",
          schema: customerRequestResponseSchema,
        },
        400: "The request body could not be parsed or validated.",
      },
    },
  ]),
] as const satisfies readonly import("./common").ApiContract[];
