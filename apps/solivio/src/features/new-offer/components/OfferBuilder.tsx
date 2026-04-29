"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { Offer } from "@solivio/domain";
import { ProductSearchDialog, type ProductSearchMatch } from "@/features/product-search";
import { OfferBuilderHeader } from "./OfferBuilderHeader";
import { OfferProductsReview } from "./OfferProductsReview";
import { OfferSummary } from "./OfferSummary";
import type { DraftLine, SaveState } from "./offer-builder-types";

type OfferBuilderProps = {
  assistantToggle?: ReactNode;
  customerName?: string;
  offer: Offer;
  onOfferChange?: (offer: Offer) => void;
};

function toDraftLines(offer: Offer): DraftLine[] {
  return offer.items.map((item) => ({
    offerProductId: item.offerProductId,
    productId: item.productId,
    sku: item.product?.sku,
    name: item.product?.name ?? item.productId,
    description: item.product?.description,
    manufacturer: item.product?.manufacturer,
    availability: item.product?.availability,
    source: item.product?.source,
    quantity: item.quantity,
    requestItem: item.requestItem,
    unitPrice: item.unitPriceNet ?? item.product?.priceNet ?? 0,
    currency: item.currency ?? item.product?.currency ?? "PLN",
    confidence:
      item.confidence ?? (item.product?.matchScore ? Math.round(item.product.matchScore * 100) : 75),
    rationale: item.rationale,
  }));
}

function toUpdateItems(lines: DraftLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    rationale: line.rationale,
    requestItem: line.requestItem,
    confidence: line.confidence,
    product: {
      id: line.productId,
      sku: line.sku,
      name: line.name,
      description: line.description,
      manufacturer: line.manufacturer,
      availability: line.availability,
      source: line.source ?? ("database" as const)
    }
  }));
}

async function parseOfferResponse(response: Response): Promise<Offer> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
  }
  return payload.offer as Offer;
}

export function OfferBuilder({ assistantToggle, customerName, offer, onOfferChange }: OfferBuilderProps) {
  const [status, setStatus] = useState<Offer["status"]>(offer.status);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const displayCustomerName = customerName ?? offer.customerName ?? "Demo customer";
  const [discountPercent, setDiscountPercent] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(() => toDraftLines(offer));
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(() => new Set());

  const currency = lines[0]?.currency ?? "PLN";
  const searchQuantities = Object.fromEntries(
    lines.map((line) => [line.productId, line.quantity])
  );
  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
    [lines]
  );
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;
  const estimatedCost = subtotal * 0.7;
  const margin = total > 0 ? ((total - estimatedCost) / total) * 100 : 0;
  const limitedLineCount = lines.filter((line) => line.availability === "limited").length;
  const unpricedLineCount = lines.filter((line) => line.unitPrice <= 0).length;
  const requestText = offer.clientRequest?.trim() || "No customer request text was attached to this draft.";
  const generatedDate = offer.generatedAt.slice(0, 10);

  function updateQuantity(productId: string, nextQuantity: number) {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: Math.max(1, Math.trunc(nextQuantity || 1)),
            }
          : line
      )
    );
  }

  function markPending(productId: string, pending: boolean) {
    setPendingProductIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  }

  function syncOffer(nextOffer: Offer) {
    setStatus(nextOffer.status);
    setLines(toDraftLines(nextOffer));
    onOfferChange?.(nextOffer);
  }

  async function refreshOffer() {
    const response = await fetch(`/api/offers/${offer.id}`);
    const nextOffer = await parseOfferResponse(response);
    syncOffer(nextOffer);
  }

  async function persistQuantity(line: DraftLine, nextQuantity: number) {
    const quantity = Math.max(1, Math.trunc(nextQuantity || 1));
    const nextLines = lines.map((currentLine) =>
      currentLine.productId === line.productId
        ? { ...currentLine, quantity }
        : currentLine
    );

    setLines(nextLines);
    markPending(line.productId, true);
    setSaveState("saving");

    try {
      if (!line.offerProductId) {
        await saveReview(status, nextLines);
        return;
      }

      const response = await fetch(`/api/offers/${offer.id}/products/${line.offerProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      markPending(line.productId, false);
    }
  }

  function commitQuantity(productId: string) {
    const line = lines.find((currentLine) => currentLine.productId === productId);
    if (!line) return;
    void persistQuantity(line, line.quantity);
  }

  async function removeProduct(productId: string) {
    const line = lines.find((currentLine) => currentLine.productId === productId);
    if (!line) return;

    const previousLines = lines;
    const nextLines = lines.filter((currentLine) => currentLine.productId !== productId);
    setLines(nextLines);
    markPending(productId, true);
    setSaveState("saving");

    try {
      if (!line.offerProductId) {
        await saveReview(status, nextLines);
        return;
      }

      const response = await fetch(`/api/offers/${offer.id}/products/${line.offerProductId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      }

      await refreshOffer();
      setSaveState("saved");
    } catch {
      setLines(previousLines);
      setSaveState("error");
    } finally {
      markPending(productId, false);
    }
  }

  async function handleSearchQuantityChange(product: ProductSearchMatch, quantity: number) {
    const existing = lines.find((line) => line.productId === product.id);

    if (existing) {
      if (quantity <= 0) {
        await removeProduct(product.id);
        return;
      }
      await persistQuantity(existing, quantity);
      return;
    }

    if (quantity <= 0) return;

    const optimisticLine: DraftLine = {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      manufacturer: product.manufacturer,
      quantity,
      requestItem: "Manually added",
      unitPrice: 0,
      currency: "PLN",
      confidence: 100,
      rationale: "Manually added",
      source: "database",
    };

    setLines((current) => [...current, optimisticLine]);
    markPending(product.id, true);
    setSaveState("saving");

    try {
      const response = await fetch(`/api/offers/${offer.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          requestItem: "Manually added"
        })
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      setSaveState("saved");
    } catch {
      setLines((current) => current.filter((line) => line.productId !== product.id));
      setSaveState("error");
    } finally {
      markPending(product.id, false);
    }
  }

  async function saveReview(nextStatus = status, nextLines = lines) {
    setSaveState("saving");

    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          unmatched: offer.unmatched,
          items: toUpdateItems(nextLines)
        })
      });

      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);

      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function updateStatus(nextStatus: Offer["status"]) {
    setStatus(nextStatus);
    void saveReview(nextStatus);
  }

  return (
    <section className="grid min-w-0 gap-4">
      <OfferBuilderHeader
        assistantToggle={assistantToggle}
        customerName={displayCustomerName}
        generatedDate={generatedDate}
        lineCount={lines.length}
        onAccept={() => updateStatus("accepted")}
        onAddProduct={() => setSearchOpen(true)}
        onMarkReviewed={() => updateStatus("reviewed")}
        onSave={() => void saveReview()}
        saveState={saveState}
        status={status}
      />

      <OfferProductsReview
        lines={lines}
        unmatched={offer.unmatched ?? []}
        commitQuantity={commitQuantity}
        pendingProductIds={pendingProductIds}
        removeProduct={(productId) => void removeProduct(productId)}
        updateQuantity={updateQuantity}
      />

      <OfferSummary
        currency={currency}
        discount={discount}
        discountPercent={discountPercent}
        limitedLineCount={limitedLineCount}
        margin={margin}
        notes={offer.notes}
        requestText={requestText}
        setDiscountPercent={setDiscountPercent}
        status={status}
        subtotal={subtotal}
        total={total}
        unpricedLineCount={unpricedLineCount}
      />

      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        quantities={searchQuantities}
        onQuantityChange={handleSearchQuantityChange}
      />
    </section>
  );
}
