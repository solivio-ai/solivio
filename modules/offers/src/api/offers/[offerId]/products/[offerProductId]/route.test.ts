import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  removeOfferLineItem: vi.fn(),
  updateOfferLineItem: vi.fn(),
}));

vi.mock("@solivio/sdk/runtime", () => ({
  getAuth: () => ({
    requireAuth: mocks.requireAuth,
  }),
}));

vi.mock("../../../../../server/offerService.ts", () => ({
  removeOfferLineItem: mocks.removeOfferLineItem,
  updateOfferLineItem: mocks.updateOfferLineItem,
}));

import { PATCH } from "./route.ts";

describe("offer line item route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      session: {
        user: {
          id: "test-user",
          email: "test-user@example.com",
          name: "Test User",
          role: "admin",
        },
      },
    });
  });

  test("returns offer_locked when a line item edit targets an accepted offer", async () => {
    mocks.updateOfferLineItem.mockResolvedValue("locked");

    const response = await PATCH(
      new Request("http://solivio.test/api/offers/offer-1/products/item-1", {
        method: "PATCH",
        body: JSON.stringify({ quantity: 3 }),
      }),
      {
        params: Promise.resolve({
          offerId: "offer-1",
          offerProductId: "item-1",
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "offer_locked" },
    });
    expect(mocks.updateOfferLineItem).toHaveBeenCalledWith("item-1", "offer-1", 3, "test-user");
  });
});
