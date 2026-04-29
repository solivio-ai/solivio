"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { ProductSearchDialog, type ProductSearchMatch } from "@/features/product-search";
import { OfferBuilderHeader } from "./OfferBuilderHeader";
import { OfferProductsReview } from "./OfferProductsReview";
import { OfferSummary } from "./OfferSummary";
import type { DraftLine, SaveState } from "./offer-builder-types";

type OfferBuilderProps = {
  assistantToggle?: ReactNode;
  customerName?: string;
  offer: Offer;
};

export function OfferBuilder({ assistantToggle, customerName, offer }: OfferBuilderProps) {
  const [status, setStatus] = useState<Offer["status"]>(offer.status);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const displayCustomerName = customerName ?? offer.customerName ?? "Demo customer";
  const [discountPercent, setDiscountPercent] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    offer.items.map((item) => ({
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
    }))
  );

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

  function handleSearchQuantityChange(product: ProductSearchMatch, quantity: number) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (quantity <= 0) {
        return current.filter((line) => line.productId !== product.id);
      }
      if (existing) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity } : line
        );
      }
      return [
        ...current,
        {
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
        },
      ];
    });
  }

  async function saveReview(nextStatus = status) {
    setSaveState("saving");

    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          unmatched: offer.unmatched,
          items: lines.map((line) => ({
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
              source: line.source ?? "database"
            }
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
        renderFooter={
          <div className="flex items-center justify-end gap-2 pt-4 border-t w-full mt-auto">
            <Button onClick={() => setSearchOpen(false)}>Done</Button>
          </div>
        }
      />
    </section>
  );
}
