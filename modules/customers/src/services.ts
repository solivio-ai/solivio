import { CustomerSelectionError, customerNamesMatch, normalizeCustomerName } from "@solivio/domain";
import type { Services } from "@solivio/sdk";

import type { CustomerRow } from "./server/customerRepository.ts";
import {
  findCustomerById,
  searchCustomers,
  upsertCustomerByName,
} from "./server/customerRepository.ts";
import type { RequestRow } from "./server/requestRepository.ts";
import { findRequestById, insertRequest } from "./server/requestRepository.ts";

export type { CustomerRow, RequestRow };

/**
 * The customers module's public API. Other modules and the host reach
 * customers/requests exclusively through this service
 * (`getService("customers")`); the tables and repositories are module-private.
 */
export interface CustomersService {
  findById(id: string): Promise<CustomerRow | null>;
  searchCustomers(query?: string, limit?: number): Promise<CustomerRow[]>;
  /** Find-or-create by display name (normalized, concurrency-safe). */
  upsertByName(name: string, source?: string): Promise<CustomerRow>;
  /**
   * Resolve a customer for an operation: by explicit id (validated, with
   * optional name cross-check) or by name upsert. Returns null when neither
   * is provided. Throws {@link CustomerSelectionError} on invalid selection.
   */
  resolveCustomer(
    input: { customerId?: string | null; customerName?: string | null },
    source: string,
  ): Promise<CustomerRow | null>;
  /** Record an intake request. */
  createRequest(input: {
    customerId: string | null;
    rawText: string;
    source?: string;
  }): Promise<RequestRow>;
  findRequestById(id: string): Promise<RequestRow | null>;
}

declare module "@solivio/sdk" {
  interface Services {
    customers: CustomersService;
  }
}

function createCustomersService(): CustomersService {
  return {
    findById: (id) => findCustomerById(id),
    searchCustomers: (query, limit) => searchCustomers(query, limit),
    upsertByName: (name, source) => upsertCustomerByName(name, source),
    async resolveCustomer(input, source) {
      const customerId = input.customerId?.trim() || null;
      const customerName = input.customerName ? normalizeCustomerName(input.customerName) : "";

      if (customerId) {
        const customer = await findCustomerById(customerId);
        if (!customer) {
          throw new CustomerSelectionError(
            "customer_not_found",
            "Selected customer was not found.",
          );
        }
        if (customerName && !customerNamesMatch(customer.name, customerName)) {
          throw new CustomerSelectionError(
            "customer_mismatch",
            "Selected customer does not match the provided customer name.",
          );
        }
        return customer;
      }

      if (customerName) {
        return upsertCustomerByName(customerName, source);
      }

      return null;
    },
    createRequest: (input) => insertRequest(input),
    findRequestById: (id) => findRequestById(id),
  };
}

export const services = {
  customers: (_deps: Services) => createCustomersService(),
};
