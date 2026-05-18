"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import type { ProductSearchMatch } from "@/features/product-search";
import { ProductSearchDialog } from "@/features/product-search";
import { calculateNetTotal, calculateSubtotalNet } from "@/lib/offerTotals";

import { OfferBuilderActionBar, OfferBuilderHeader } from "./OfferBuilderHeader";
import { OfferProductsReview } from "./OfferProductsReview";
import { OfferSummary } from "./OfferSummary";
import type { ValidationResult } from "./OfferValidationDialog";
import { OfferValidationDialog } from "./OfferValidationDialog";
import type { DraftLine, SaveState } from "./offer-builder-types";
import { ProductMatchDialog } from "./ProductMatchDialog";

type OfferBuilderProps = {
  assistantToggle?: ReactNode;
  customerName?: string;
  offer: Offer;
  onOfferChange?: (offer: Offer) => void;
  onDiscountPercentChange: (discountPercent: number) => void;
  onAccepted?: (offer: Offer) => void;
  onSendToChat?: (message: string) => void;
};

type FailedSaveAction =
  | { kind: "save-review" }
  | { kind: "quantity"; productId: string }
  | { kind: "remove"; productId: string }
  | { kind: "add-product"; product: ProductSearchMatch; quantity: number };

function toDraftLines(offer: Offer): DraftLine[] {
  return offer.items.map((item) => ({
    offerProductId: item.id,
    productId: item.productId ?? "",
    sku: item.product?.sku,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    requestItem: item.requestItem,
    unitPrice: item.unitPriceNet,
    currency: offer.currency,
    rationale: item.rationale,
  }));
}

function toUpdateItems(lines: DraftLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    rationale: line.rationale,
    requestItem: line.requestItem,
    name: line.name,
    description: line.description,
  }));
}

async function parseOfferResponse(response: Response): Promise<Offer> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
  }
  return payload.offer as Offer;
}

export function OfferBuilder({
  assistantToggle,
  customerName,
  offer,
  onOfferChange,
  onDiscountPercentChange,
  onAccepted,
  onSendToChat,
}: OfferBuilderProps) {
  const tBuilder = useTranslations("NewOffer.builder");
  const [status, setStatus] = useState<Offer["status"]>(offer.status);
  const [failedAction, setFailedAction] = useState<FailedSaveAction | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const offerHeaderTitle = useMemo(() => {
    const name = offer.name?.trim();
    if (name) return name;
    const fromCustomer = (customerName ?? offer.customerName)?.trim();
    if (fromCustomer) return fromCustomer;
    return tBuilder("titleFallback");
  }, [offer.name, customerName, offer.customerName, tBuilder]);
  const [validateState, setValidateState] = useState<"idle" | "loading">("idle");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchingUnmatchedItem, setMatchingUnmatchedItem] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftLine[]>(() => toDraftLines(offer));
  const [unmatched, setUnmatched] = useState<string[]>(() => offer.unmatched ?? []);
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(() => new Set());
  const [actionBarCompact, setActionBarCompact] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const discountPercent = offer.discountPercent;

  useEffect(() => {
    setLines(toDraftLines(offer));
    setStatus(offer.status);
    setUnmatched(offer.unmatched ?? []);
  }, [offer]);

  const currency = lines[0]?.currency ?? offer.currency;
  const searchQuantities = Object.fromEntries(lines.map((line) => [line.productId, line.quantity]));
  const subtotal = useMemo(
    () =>
      calculateSubtotalNet(lines.map((l) => ({ quantity: l.quantity, unitPriceNet: l.unitPrice }))),
    [lines],
  );
  const discount = subtotal * (discountPercent / 100);
  const total = calculateNetTotal(subtotal, discountPercent);
  const requestText = offer.clientRequest?.trim() || tBuilder("noRequestText");
  const generatedDate = offer.createdAt.slice(0, 10);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let parent = section.parentElement;
    let scrollContainer: HTMLElement | null = null;

    while (parent) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY)) {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (!scrollContainer) return;

    const updateCompactState = () => {
      setActionBarCompact(scrollContainer.scrollTop > 24);
    };

    updateCompactState();
    scrollContainer.addEventListener("scroll", updateCompactState, { passive: true });
    window.addEventListener("resize", updateCompactState);

    return () => {
      scrollContainer.removeEventListener("scroll", updateCompactState);
      window.removeEventListener("resize", updateCompactState);
    };
  }, []);

  function updateQuantity(productId: string, nextQuantity: number) {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: Math.max(1, Math.trunc(nextQuantity || 1)),
            }
          : line,
      ),
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

  function markSaving() {
    setFailedAction(null);
    setSaveState("saving");
  }

  function markSaved() {
    setFailedAction(null);
    setSaveState("saved");
  }

  function markSaveError(action: FailedSaveAction) {
    setFailedAction(action);
    setSaveState("error");
  }

  function syncOffer(nextOffer: Offer) {
    setStatus(nextOffer.status);
    setLines(toDraftLines(nextOffer));
    setUnmatched(nextOffer.unmatched ?? []);
    onOfferChange?.(nextOffer);
  }

  async function refreshOffer() {
    const response = await fetch(`/api/offers/${offer.id}`);
    const nextOffer = await parseOfferResponse(response);
    syncOffer(nextOffer);
  }

  async function persistQuantity(line: DraftLine, nextQuantity: number): Promise<boolean> {
    const quantity = Math.max(1, Math.trunc(nextQuantity || 1));
    const nextLines = lines.map((currentLine) =>
      currentLine.productId === line.productId ? { ...currentLine, quantity } : currentLine,
    );

    setLines(nextLines);
    markPending(line.productId, true);
    markSaving();

    try {
      if (!line.offerProductId) {
        return await saveReview(status, nextLines);
      }

      const response = await fetch(`/api/offers/${offer.id}/products/${line.offerProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      markSaved();
      return true;
    } catch {
      markSaveError({ kind: "quantity", productId: line.productId });
      return false;
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
    markSaving();

    try {
      if (!line.offerProductId) {
        await saveReview(status, nextLines);
        return;
      }

      const response = await fetch(`/api/offers/${offer.id}/products/${line.offerProductId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      }

      await refreshOffer();
      markSaved();
    } catch {
      setLines(previousLines);
      markSaveError({ kind: "remove", productId });
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
      quantity,
      requestItem: tBuilder("manuallyAdded"),
      unitPrice: 0,
      currency: offer.currency,
      rationale: tBuilder("manuallyAdded"),
      source: "database",
    };

    setLines((current) => [...current, optimisticLine]);
    markPending(product.id, true);
    markSaving();

    try {
      const response = await fetch(`/api/offers/${offer.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          requestItem: tBuilder("manuallyAdded"),
        }),
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      markSaved();
    } catch {
      setLines((current) => current.filter((line) => line.productId !== product.id));
      markSaveError({ kind: "add-product", product, quantity });
    } finally {
      markPending(product.id, false);
    }
  }

  async function removeUnmatched(item: string) {
    const nextUnmatched = unmatched.filter((u) => u !== item);
    setUnmatched(nextUnmatched);
    markSaving();
    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unmatched: nextUnmatched }),
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      markSaved();
    } catch {
      setUnmatched(unmatched);
      markSaveError({ kind: "save-review" });
    }
  }

  function handleManuallyMatch(item: string) {
    setMatchingUnmatchedItem(item);
  }

  async function handleConfirmMatch(product: ProductSearchMatch, quantity: number) {
    const item = matchingUnmatchedItem;
    if (!item) return;
    setMatchingUnmatchedItem(null);

    const existing = lines.find((line) => line.productId === product.id);

    if (existing) {
      const ok = await persistQuantity(existing, quantity);
      if (ok) {
        await removeUnmatched(item);
      }
      return;
    }

    const optimisticLine: DraftLine = {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      manufacturer: product.manufacturer,
      quantity,
      requestItem: item,
      unitPrice: 0,
      currency: "PLN",
      rationale: item,
      source: "database",
    };

    setLines((current) => [...current, optimisticLine]);
    markPending(product.id, true);
    markSaving();

    try {
      const response = await fetch(`/api/offers/${offer.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          requestItem: item,
        }),
      });
      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      markSaved();
      await removeUnmatched(item);
    } catch {
      setLines((current) => current.filter((line) => line.productId !== product.id));
      markSaveError({ kind: "add-product", product, quantity });
    } finally {
      markPending(product.id, false);
    }
  }

  async function saveReview(nextStatus = status, nextLines = lines): Promise<boolean> {
    markSaving();

    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          unmatched,
          items: toUpdateItems(nextLines),
        }),
      });

      const nextOffer = await parseOfferResponse(response);
      syncOffer(nextOffer);
      if (nextStatus === "accepted") {
        onAccepted?.(nextOffer);
      }

      markSaved();
      return true;
    } catch {
      markSaveError({ kind: "save-review" });
      return false;
    }
  }

  function updateStatus(nextStatus: Offer["status"]) {
    setStatus(nextStatus);
    void saveReview(nextStatus);
  }

  async function handleValidate() {
    setValidateState("loading");
    try {
      const response = await fetch(`/api/offers/${offer.id}/validate`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.validation) {
        setValidationResult(payload.validation as ValidationResult);
      }
    } finally {
      setValidateState("idle");
    }
  }

  function retrySave() {
    if (!failedAction) {
      void saveReview();
      return;
    }

    if (failedAction.kind === "save-review") {
      void saveReview();
      return;
    }

    if (failedAction.kind === "quantity") {
      const line = lines.find((currentLine) => currentLine.productId === failedAction.productId);
      if (!line) {
        void saveReview();
        return;
      }
      void persistQuantity(line, line.quantity);
      return;
    }

    if (failedAction.kind === "remove") {
      void removeProduct(failedAction.productId);
      return;
    }

    void handleSearchQuantityChange(failedAction.product, failedAction.quantity);
  }

  return (
    <section ref={sectionRef} className="grid min-w-0 gap-4 pb-3">
      <OfferBuilderHeader
        generatedDate={generatedDate}
        lineCount={lines.length}
        offerTitle={offerHeaderTitle}
        status={status}
        userName={offer.userName}
        createdAt={offer.createdAt}
      />

      <OfferProductsReview
        lines={lines}
        unmatched={unmatched}
        commitQuantity={commitQuantity}
        pendingProductIds={pendingProductIds}
        removeProduct={(productId) => void removeProduct(productId)}
        removeUnmatched={(item) => void removeUnmatched(item)}
        onManuallyMatch={handleManuallyMatch}
        updateQuantity={updateQuantity}
        status={status}
      />

      <OfferSummary
        currency={currency}
        discount={discount}
        discountPercent={discountPercent}
        notes={offer.notes}
        requestText={requestText}
        setDiscountPercent={onDiscountPercentChange}
        status={status}
        subtotal={subtotal}
        total={total}
      />

      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        quantities={searchQuantities}
        onQuantityChange={handleSearchQuantityChange}
        renderFooter={
          <div className="flex items-center justify-end gap-2 pt-4 border-t w-full mt-auto">
            <Button onClick={() => setSearchOpen(false)}>{tBuilder("done")}</Button>
          </div>
        }
      />

      <ProductMatchDialog
        open={matchingUnmatchedItem !== null}
        onOpenChange={(open) => {
          if (!open) setMatchingUnmatchedItem(null);
        }}
        unmatchedItem={matchingUnmatchedItem ?? ""}
        onConfirm={(product, qty) => void handleConfirmMatch(product, qty)}
      />

      {validationResult && (
        <OfferValidationDialog
          open
          onOpenChange={(open) => {
            if (!open) setValidationResult(null);
          }}
          result={validationResult}
          onAccept={() => updateStatus("accepted")}
          onSendToChat={onSendToChat}
        />
      )}

      <OfferBuilderActionBar
        assistantToggle={assistantToggle}
        compact={actionBarCompact}
        formCustomerName={offer.customerName?.trim() ?? ""}
        formName={offer.name?.trim() ?? ""}
        offerId={offer.id}
        offerTitle={offerHeaderTitle}
        onAccept={() => void saveReview("accepted")}
        onReopen={() => void saveReview("draft")}
        onValidate={() => void handleValidate()}
        validateState={validateState}
        onAddProduct={() => setSearchOpen(true)}
        onRetrySave={retrySave}
        saveState={saveState}
        status={status}
        onUpdate={syncOffer}
      />
    </section>
  );
}
