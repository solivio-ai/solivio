import { beforeEach, describe, expect, test, vi } from "vitest";

import { OFFER_STATUS } from "@solivio/domain";

const mocks = vi.hoisted(() => ({
  emitEvent: vi.fn(),
  findOfferById: vi.fn(),
  persistOfferMeta: vi.fn(),
  touchOffer: vi.fn(),
  saveRevision: vi.fn(),
  committed: [] as string[],
}));

vi.mock("@solivio/sdk/runtime", () => ({
  emitEvent: mocks.emitEvent,
  getService: () => ({}),
  db: {
    // Runs the callback and records that the commit happened, so a test can
    // assert ordering between the commit and the emit.
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const result = await fn({});
      mocks.committed.push("commit");
      return result;
    },
  },
}));

vi.mock("./offerRepository.ts", () => ({
  findOfferById: mocks.findOfferById,
  offerRowToDomain: (row: unknown) => row,
  updateOfferMeta: mocks.persistOfferMeta,
  touchOffer: mocks.touchOffer,
  deleteOfferItem: vi.fn(),
  deleteOffer: vi.fn(),
  getRecentOffers: vi.fn(),
  insertOffer: vi.fn(),
  insertOfferItem: vi.fn(),
  insertOfferItems: vi.fn(),
  insertOfferUnmatchedItems: vi.fn(),
  updateOfferItem: vi.fn(),
}));

vi.mock("./offerRevisionService.ts", () => ({
  saveRevision: mocks.saveRevision,
}));

import { updateOfferMeta } from "./offerService.ts";

const OFFER_ID = "3f2a1b4c-0000-0000-0000-000000000000";

function existingOffer(status: string) {
  return { id: OFFER_ID, status };
}

describe("offers.offer.accepted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.committed.length = 0;
    mocks.persistOfferMeta.mockResolvedValue({ id: OFFER_ID });
  });

  test("is emitted when a draft offer is accepted", async () => {
    mocks.findOfferById.mockResolvedValue(existingOffer(OFFER_STATUS.DRAFT));

    await updateOfferMeta(OFFER_ID, { status: OFFER_STATUS.ACCEPTED });

    expect(mocks.emitEvent).toHaveBeenCalledWith("offers.offer.accepted", { offerId: OFFER_ID });
  });

  test("is emitted only after the transaction commits", async () => {
    // A subscriber that loads the offer would race a transaction still in flight.
    mocks.findOfferById.mockResolvedValue(existingOffer(OFFER_STATUS.DRAFT));
    mocks.emitEvent.mockImplementation(async () => {
      mocks.committed.push("emit");
    });

    await updateOfferMeta(OFFER_ID, { status: OFFER_STATUS.ACCEPTED });

    expect(mocks.committed).toEqual(["commit", "emit"]);
  });

  test("is not emitted for an edit that leaves the status alone", async () => {
    mocks.findOfferById.mockResolvedValue(existingOffer(OFFER_STATUS.DRAFT));

    await updateOfferMeta(OFFER_ID, { discountPercent: 5 });

    expect(mocks.emitEvent).not.toHaveBeenCalled();
  });

  test("is not emitted when the offer does not exist", async () => {
    mocks.findOfferById.mockResolvedValue(null);

    await updateOfferMeta(OFFER_ID, { status: OFFER_STATUS.ACCEPTED });

    expect(mocks.emitEvent).not.toHaveBeenCalled();
  });

  test("cannot fire twice: an accepted offer rejects a second accept", async () => {
    // The guard in updateOfferMeta is what makes "result is non-null and the
    // status is accepted" equivalent to a real transition.
    mocks.findOfferById.mockResolvedValue(existingOffer(OFFER_STATUS.ACCEPTED));

    const result = await updateOfferMeta(OFFER_ID, { status: OFFER_STATUS.ACCEPTED });

    expect(result).toBeNull();
    expect(mocks.emitEvent).not.toHaveBeenCalled();
  });

  test("is not emitted when an accepted offer is reopened to draft", async () => {
    mocks.findOfferById.mockResolvedValue(existingOffer(OFFER_STATUS.ACCEPTED));

    await updateOfferMeta(OFFER_ID, { status: OFFER_STATUS.DRAFT });

    expect(mocks.emitEvent).not.toHaveBeenCalled();
  });
});
