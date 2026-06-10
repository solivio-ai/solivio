import { NextResponse } from "next/server";

import { errorResponseSchema } from "@solivio/sdk/contracts";
import { getAuth } from "@solivio/sdk/runtime";

import {
  createCustomerRequestSchema,
  customerResponseSchema,
  customersResponseSchema,
} from "../../contracts/customer.ts";
import { searchCustomers, upsertCustomerByName } from "../../server/customerRepository.ts";

export const runtime = "nodejs";

function customerDto(customer: { id: string; name: string; source: string }) {
  return { id: customer.id, name: customer.name, source: customer.source };
}

export async function GET(request: Request) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const customers = await searchCustomers(query, limit);

  return NextResponse.json(
    customersResponseSchema.parse({
      customers: customers.map((customer) => customerDto(customer)),
    }),
  );
}

export async function POST(request: Request) {
  const auth = await getAuth().requireAuth();
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
