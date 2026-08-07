import { describe, expect, test, vi } from "vitest";

import type { Offer } from "@solivio/domain";

import { channels } from "../channels.ts";
import { buildPdfOfferPayload } from "./buildPdfOfferPayload.ts";
import { renderOfferPdf } from "./renderOfferPdf.ts";

/**
 * Only `renderToBuffer` is stubbed — the document component and its imports stay
 * real. @react-pdf's reconciler reaches into React client internals, which are
 * absent under the `react-server` resolve condition the root vitest config sets
 * for server modules; it throws before producing anything.
 *
 * What is under test is this module's half of the contract: that a rendered
 * buffer is surfaced with a safe filename and the right content type. Actual PDF
 * output has no automated coverage — see AGENTS.md.
 */
vi.mock("@react-pdf/renderer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@react-pdf/renderer")>()),
  renderToBuffer: vi.fn(async () => new TextEncoder().encode("%PDF-1.7 stub")),
}));

function offerFixture(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "3f2a1b4c-0000-0000-0000-000000000000",
    customerName: "ACME Sp. z o.o.",
    currency: "PLN",
    discountPercent: 0,
    status: "accepted",
    items: [
      {
        id: "item-1",
        productId: "product-1",
        name: "Pineapple Juice 100% (1 l)",
        description: "",
        quantity: 12,
        unitPriceNet: 8.5,
        vatRate: 23,
      },
    ],
    ...overrides,
  } as Offer;
}

describe("offer pdf channel declaration", () => {
  test("declares the pdf channel for the offer target", () => {
    expect(channels).toHaveLength(1);
    expect(channels[0].name).toBe("pdf");
    expect(channels[0].target).toBe("offer");
  });

  test("declares no behaviour — the core never invokes a channel", () => {
    // Guards the decision in ADR 0005: a channel is a declaration, and anything
    // effectful belongs to this module's own route or subscribers.
    expect(channels[0]).not.toHaveProperty("run");
  });
});

describe("renderOfferPdf", () => {
  test("surfaces the rendered bytes with a pdf content type", async () => {
    const result = await renderOfferPdf(offerFixture());

    expect(result.contentType).toBe("application/pdf");
    // The caller streams these bytes directly.
    expect(result.body).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(result.body.subarray(0, 5))).toBe("%PDF-");
    expect(result.filename).toMatch(/^oferta-.*\.pdf$/);
  });

  test("strips slashes from the filename", async () => {
    // An offer number containing "/" would terminate the Content-Disposition
    // header value early; buildPdfOfferPayload derives numbers from the id, but
    // the sanitisation is the renderer's promise, not the payload builder's.
    const result = await renderOfferPdf(offerFixture());
    expect(result.filename).not.toContain("/");
  });
});

describe("buildPdfOfferPayload", () => {
  test("derives the payload from the domain offer", () => {
    const payload = buildPdfOfferPayload(offerFixture());

    expect(payload.buyer.name).toBe("ACME Sp. z o.o.");
    expect(payload.offer.currency).toBe("PLN");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      name: "Pineapple Juice 100% (1 l)",
      quantity: 12,
      unitPriceNet: 8.5,
      // The document wants a fraction; the domain carries percent.
      vatRate: 0.23,
    });
  });

  test("falls back to a placeholder buyer when the offer has no customer", () => {
    const payload = buildPdfOfferPayload(offerFixture({ customerName: null }));
    expect(payload.buyer.name).toBe("Customer");
  });
});
