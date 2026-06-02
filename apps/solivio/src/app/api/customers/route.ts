import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponseSchema } from "@/server/api/schemas/common";
import { requireAuth } from "@/server/auth/session";
import { searchCustomers, upsertCustomerByName } from "@/server/customers/customerRepository";

export const runtime = "nodejs";

const customerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    source: z.string(),
  })
  .strict()
  .meta({ id: "Customer", description: "A customer available for offer assignment." });

const customersResponseSchema = z
  .object({
    customers: z.array(customerSchema),
  })
  .strict()
  .meta({ id: "CustomersResponse" });

const createCustomerRequestSchema = z
  .object({
    name: z.string().trim().min(1),
    source: z.string().trim().min(1).optional(),
  })
  .strict()
  .meta({ id: "CreateCustomerRequest" });

const customerResponseSchema = z
  .object({
    customer: customerSchema,
  })
  .strict()
  .meta({ id: "CustomerResponse" });

const customerSearchQuerySchema = z
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

function customerDto(customer: { id: string; name: string; source: string }) {
  return { id: customer.id, name: customer.name, source: customer.source };
}

/**
 * Search customers
 * @operationId searchCustomers
 * @tag Customers
 * @auth sessionCookie
 * @queryParams customerSearchQuerySchema
 * @response 200:customersResponseSchema:Customers matching the query.
 * @add 400:ErrorResponse:The customer search query was invalid.
 * @openapi
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const search = customerSearchQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
  });
  if (!search.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_query",
          message: "Customer search query is invalid.",
          issues: search.error.issues.map((issue) => issue.message),
        },
      }),
      { status: 400 },
    );
  }

  const query = search.data.query ?? search.data.q ?? "";
  const limit = search.data.limit ?? 20;
  const customers = await searchCustomers(query, limit);

  return NextResponse.json(
    customersResponseSchema.parse({
      customers: customers.map((customer) => customerDto(customer)),
    }),
  );
}

/**
 * Create or reuse a customer
 * @operationId createCustomer
 * @tag Customers
 * @auth sessionCookie
 * @bodyDescription Customer display name.
 * @body createCustomerRequestSchema
 * @response 201:customerResponseSchema:The created or existing customer.
 * @add 400:ErrorResponse:The request body could not be parsed or validated.
 * @openapi
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const input = createCustomerRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!input.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Customer name is required.",
          issues: input.error.issues.map((issue) => issue.message),
        },
      }),
      { status: 400 },
    );
  }

  const customer = await upsertCustomerByName(input.data.name, input.data.source ?? "manual");
  return NextResponse.json(customerResponseSchema.parse({ customer: customerDto(customer) }), {
    status: 201,
  });
}
