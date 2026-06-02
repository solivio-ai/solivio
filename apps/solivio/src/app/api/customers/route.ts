import { NextResponse } from "next/server";

import { requireAuth } from "@/server/auth/session";
import { searchCustomers, upsertCustomerByName } from "@/server/customers/customerRepository";

import {
  createCustomerRequestSchema,
  customerResponseSchema,
  customerSearchQuerySchema,
  customersResponseSchema,
  errorResponseSchema,
} from "./openapi";

export const runtime = "nodejs";

function customerDto(customer: { id: string; name: string; source: string }) {
  return { id: customer.id, name: customer.name, source: customer.source };
}

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
