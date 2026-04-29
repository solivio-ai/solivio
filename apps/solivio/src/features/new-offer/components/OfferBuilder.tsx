"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PackageSearch,
  Plus,
  Save,
  Send,
} from "lucide-react";
import {
  ProductSearchDialog,
  type ProductSearchMatch,
} from "@/features/product-search";
import { useMemo, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OfferBuilderProps = {
  customerName?: string;
  offer: Offer;
};

type DraftLine = {
  productId: string;
  sku?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  availability?: NonNullable<Offer["items"][number]["product"]>["availability"];
  source?: NonNullable<Offer["items"][number]["product"]>["source"];
  quantity: number;
  unitPrice: number;
  currency: "PLN" | "EUR";
  confidence: number;
  rationale: string;
};

const formatCurrency = (amount: number, currency: DraftLine["currency"]) =>
  new Intl.NumberFormat("pl-PL", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);

export function OfferBuilder({ customerName, offer }: OfferBuilderProps) {
  const [status, setStatus] = useState<Offer["status"]>(offer.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
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
  const limitedLines = lines.filter((line) => line.availability === "limited");
  const unpricedLines = lines.filter((line) => line.unitPrice <= 0);
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

  function updateUnitPrice(productId: string, nextPrice: number) {
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              unitPrice: Math.max(0, nextPrice || 0),
            }
          : line
      )
    );
  }

  function handleSearchQuantityChange(product: ProductSearchMatch, quantity: number) {
    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (quantity <= 0) {
        return current.filter((l) => l.productId !== product.id);
      }
      if (existing) {
        return current.map((l) =>
          l.productId === product.id ? { ...l, quantity } : l
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
          unitPrice: 0,
          currency: "PLN" as const,
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
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            rationale: line.rationale,
            confidence: line.confidence,
            unitPriceNet: line.unitPrice,
            currency: line.currency,
            product: {
              id: line.productId,
              sku: line.sku,
              name: line.name,
              description: line.description,
              manufacturer: line.manufacturer,
              availability: line.availability,
              priceNet: line.unitPrice,
              currency: line.currency,
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
      <header className="grid min-w-0 gap-3 rounded-lg border bg-card p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid min-w-0 gap-2">
          <h1 className="text-xl leading-tight font-semibold">Offer for {displayCustomerName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status === "accepted" ? "default" : status === "reviewed" ? "secondary" : "outline"}>
              {status}
            </Badge>
            <Badge variant="secondary">{lines.length} products</Badge>
            <Badge variant="outline">Generated {generatedDate}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          <Button className="w-full sm:w-auto" onClick={() => setSearchOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Add product
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => void saveReview()}>
            <Save size={16} aria-hidden="true" />
            Save review
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => updateStatus("reviewed")}>
            <ClipboardCheck size={16} aria-hidden="true" />
            Mark reviewed
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => updateStatus("accepted")}>
            <Send size={16} aria-hidden="true" />
            Accept draft
          </Button>
        </div>
        {saveState !== "idle" ? (
          <p className="text-xs text-muted-foreground lg:col-span-2">
            {saveState === "saving"
              ? "Saving review..."
              : saveState === "saved"
                ? "Review saved for this offer id."
              : "Could not save review edits."}
          </p>
        ) : null}
      </header>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PackageSearch size={18} aria-hidden="true" className="text-primary" />
            <CardTitle>Products</CardTitle>
          </div>
          <CardDescription>Review the matched products, quantities, and pricing first.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3">
          <div className="grid gap-3 md:hidden">
            {lines.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No products in this offer yet.
              </div>
            ) : (
              lines.map((line) => (
                <ProductLineCard
                  key={line.productId}
                  line={line}
                  updateQuantity={updateQuantity}
                  updateUnitPrice={updateUnitPrice}
                />
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[56%] min-w-[420px]">Product</TableHead>
                  <TableHead className="w-28 text-right">Qty</TableHead>
                  <TableHead className="w-36 text-right">Unit price</TableHead>
                  <TableHead className="w-40 text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                      No products in this offer yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.productId}>
                      <TableCell className="whitespace-normal py-4">
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold">{line.name}</span>
                            {line.availability ? (
                              <Badge variant={line.availability === "limited" ? "secondary" : "outline"}>
                                {line.availability}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {line.sku ? <span>{line.sku}</span> : null}
                            {line.manufacturer ? <span>{line.manufacturer}</span> : null}
                            <span>Match {line.confidence}%</span>
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">{line.rationale}</p>
                          {line.description ? (
                            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                              {line.description}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          aria-label={`Quantity for ${line.name}`}
                          className="ml-auto w-20 text-right"
                          min={1}
                          type="number"
                          value={line.quantity}
                          onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          aria-label={`Unit price for ${line.name}`}
                          className="ml-auto w-28 text-right"
                          min={0}
                          step="0.01"
                          type="number"
                          value={line.unitPrice}
                          onChange={(event) => updateUnitPrice(line.productId, Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right text-base font-semibold">
                        {formatCurrency(line.quantity * line.unitPrice, line.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Totals and the checks needed before this draft is sent.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-5">
            <section className="grid gap-2">
              <h2 className="text-sm font-medium">Customer request</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{requestText}</p>
            </section>

            <section className="grid gap-3">
              <h2 className="text-sm font-medium">Review checks</h2>
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                <ValidationRow ok={margin >= 28} text={`Target margin: ${margin.toFixed(1)}%`} />
                <ValidationRow
                  ok={unpricedLines.length === 0}
                  text={
                    unpricedLines.length === 0
                      ? "All lines have prices"
                      : `${unpricedLines.length} line needs a unit price`
                  }
                />
                <ValidationRow
                  ok={limitedLines.length === 0}
                  text={
                    limitedLines.length === 0
                      ? "Availability confirmed"
                      : `${limitedLines.length} line needs availability confirmation`
                  }
                />
                <ValidationRow ok={status !== "draft"} text="Sales review marked complete" />
              </div>
            </section>

            {offer.notes.length > 0 ? (
              <section className="grid gap-3">
                <h2 className="text-sm font-medium">Notes</h2>
                <div className="grid gap-2">
                  {offer.notes.map((note) => (
                    <div key={note} className="flex gap-2 rounded-lg border bg-background/60 p-3 text-sm leading-relaxed">
                      <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <section className="grid min-w-0 content-start gap-4 rounded-lg border bg-background/60 p-4">
            <h2 className="text-sm font-medium">Commercial totals</h2>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-muted-foreground" htmlFor="discount-percent">
                  Discount
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="discount-percent"
                    className="w-16 text-right"
                    max={25}
                    min={0}
                    type="number"
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(Math.max(0, Number(event.target.value) || 0))}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <span className="text-muted-foreground">Discount value</span>
                <span className="font-medium">{formatCurrency(discount, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-base">
                <span className="font-medium">Total net</span>
                <span className="text-lg font-semibold">{formatCurrency(total, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>Estimated margin</span>
                <Badge variant={margin >= 28 ? "outline" : "destructive"}>{margin.toFixed(1)}%</Badge>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        quantities={searchQuantities}
        onQuantityChange={handleSearchQuantityChange}
      />
    </section>
  );
}

function ProductLineCard({
  line,
  updateQuantity,
  updateUnitPrice,
}: {
  line: DraftLine;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  updateUnitPrice: (productId: string, nextPrice: number) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border bg-background/60 p-3">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{line.name}</span>
          {line.availability ? (
            <Badge variant={line.availability === "limited" ? "secondary" : "outline"}>
              {line.availability}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {line.sku ? <span>{line.sku}</span> : null}
          {line.manufacturer ? <span>{line.manufacturer}</span> : null}
          <span>Match {line.confidence}%</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{line.rationale}</p>
        {line.description ? (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{line.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${line.productId}-quantity`}>
            Quantity
          </label>
          <Input
            id={`${line.productId}-quantity`}
            aria-label={`Quantity for ${line.name}`}
            className="text-right"
            min={1}
            type="number"
            value={line.quantity}
            onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${line.productId}-unit-price`}>
            Unit price
          </label>
          <Input
            id={`${line.productId}-unit-price`}
            aria-label={`Unit price for ${line.name}`}
            className="text-right"
            min={0}
            step="0.01"
            type="number"
            value={line.unitPrice}
            onChange={(event) => updateUnitPrice(line.productId, Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-3">
        <span className="text-sm text-muted-foreground">Line total</span>
        <span className="font-semibold">{formatCurrency(line.quantity * line.unitPrice, line.currency)}</span>
      </div>
    </div>
  );
}

function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/60 p-3 text-sm">
      {ok ? (
        <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 text-primary" />
      ) : (
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0 text-destructive" />
      )}
      <span className="min-w-0">{text}</span>
    </div>
  );
}
