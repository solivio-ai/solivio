"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageSearch,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type OfferBuilderProps = {
  customerName?: string;
  offer: Offer;
  onReset?: () => void;
};

type DraftLine = {
  productId: string;
  sku?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  availability?: string;
  source?: string;
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

export function OfferBuilder({ customerName, offer, onReset }: OfferBuilderProps) {
  const [status, setStatus] = useState<Offer["status"]>(offer.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const displayCustomerName = customerName ?? offer.customerName ?? "Demo customer";
  const [intro, setIntro] = useState(
    `Thank you for the request. Based on the current catalog data, Solivio prepared this draft offer for ${displayCustomerName}.`
  );
  const [terms, setTerms] = useState(
    "Prices are net values. Final availability, installation scope, and delivery dates should be confirmed before sending."
  );
  const [discountPercent, setDiscountPercent] = useState(3);
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
  const requirements = [
    "Customer wants a structured draft instead of a blank quotation.",
    "Product matching should explain why every item was selected.",
    "Sales must validate availability, scope, and commercial terms before acceptance.",
  ];

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

  function applyConservativeDiscount() {
    setDiscountPercent(2);
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
            unitPriceNet: line.unitPrice,
            currency: line.currency
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
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{offer.id}</Badge>
            <Badge variant={status === "accepted" ? "default" : status === "reviewed" ? "secondary" : "outline"}>
              {status}
            </Badge>
            <Badge variant="secondary">{lines.length} matched items</Badge>
          </div>
          <h1 className="text-xl leading-tight font-semibold">Review draft offer for {displayCustomerName}</h1>
          <p className="text-sm text-muted-foreground">
            Sales review keeps the generated offer, product reasoning, and validation checks in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onReset ? (
            <Button variant="outline" onClick={onReset}>
              <RotateCcw size={16} aria-hidden="true" />
              New draft
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/offers/new">
                <RotateCcw size={16} aria-hidden="true" />
                New draft
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => void saveReview()}>
            <Check size={16} aria-hidden="true" />
            Save review
          </Button>
          <Button variant="secondary" onClick={() => updateStatus("reviewed")}>
            <ClipboardCheck size={16} aria-hidden="true" />
            Mark reviewed
          </Button>
          <Button onClick={() => updateStatus("accepted")}>
            <Send size={16} aria-hidden="true" />
            Accept draft
          </Button>
        </div>
        {saveState !== "idle" ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {saveState === "saving"
              ? "Saving review..."
              : saveState === "saved"
                ? "Review saved for this offer id."
                : "Could not save review edits."}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText size={18} aria-hidden="true" className="text-primary" />
              <CardTitle className="text-base">Request context</CardTitle>
            </div>
            <CardDescription>Source text and extracted needs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">{displayCustomerName}</span>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Captured request</span>
              <p className="max-h-44 overflow-auto rounded-lg border bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground">
                {requestText}
              </p>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Requirements</span>
              <ul className="grid gap-2">
                {requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-2 text-sm leading-relaxed">
                    <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PackageSearch size={18} aria-hidden="true" className="text-primary" />
              <CardTitle className="text-base">Draft offer document</CardTitle>
            </div>
            <CardDescription>Editable quotation with matched products and commercial terms.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground">Opening note</span>
              <Textarea value={intro} onChange={(event) => setIntro(event.target.value)} rows={3} />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Unit price</TableHead>
                    <TableHead className="w-32 text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.productId}>
                      <TableCell className="min-w-[260px] whitespace-normal">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{line.name}</span>
                            <Badge variant="outline">AI {line.confidence}%</Badge>
                            {line.availability ? (
                              <Badge variant={line.availability === "limited" ? "secondary" : "outline"}>
                                {line.availability}
                              </Badge>
                            ) : null}
                            {line.source ? <Badge variant="secondary">{line.source}</Badge> : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {line.sku ? <span>{line.sku}</span> : null}
                            {line.manufacturer ? <span>{line.manufacturer}</span> : null}
                          </div>
                          <span className="text-xs text-muted-foreground">{line.rationale}</span>
                          {line.description ? (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {line.description}
                            </span>
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
                          className="ml-auto w-24 text-right"
                          min={0}
                          step="0.01"
                          type="number"
                          value={line.unitPrice}
                          onChange={(event) => updateUnitPrice(line.productId, Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.quantity * line.unitPrice, line.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 rounded-lg border bg-background/60 p-4 sm:grid-cols-[1fr_260px]">
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">Commercial terms</span>
                <Textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows={4} />
              </div>
              <div className="grid content-start gap-3 text-sm">
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
                <div className="flex items-center justify-between gap-4 border-t pt-3 text-base">
                  <span className="font-medium">Total net</span>
                  <span className="font-semibold">{formatCurrency(total, currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span>Estimated margin</span>
                  <Badge variant={margin >= 28 ? "outline" : "destructive"}>{margin.toFixed(1)}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 content-start">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles size={18} aria-hidden="true" className="text-primary" />
                <CardTitle className="text-base">Review queue</CardTitle>
              </div>
              <CardDescription>Small AI suggestions ready for salesperson approval.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2 rounded-lg border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Reduce draft discount</span>
                  <Badge variant="secondary">pricing</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Lowering the discount to 2% keeps the offer above the target margin while preserving a small gesture.
                </p>
                <Button size="sm" variant="outline" onClick={applyConservativeDiscount}>
                  <Check size={15} aria-hidden="true" />
                  Apply
                </Button>
              </div>
              <div className="grid gap-2 rounded-lg border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Ask for scope confirmation</span>
                  <Badge variant="outline">follow-up</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The request does not confirm final installation size or region, so acceptance should stay gated.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} aria-hidden="true" className="text-primary" />
                <CardTitle className="text-base">Validation</CardTitle>
              </div>
              <CardDescription>Checks to complete before sending downstream.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
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
                    ? "Availability confirmed for all lines"
                    : `${limitedLines.length} line needs availability confirmation`
                }
              />
              <ValidationRow ok={status !== "draft"} text="Sales review marked complete" />
              {offer.notes.map((note) => (
                <div key={note} className="flex gap-2 rounded-lg border bg-background/60 p-3 text-sm leading-relaxed">
                  <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  <span>{note}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-3 text-sm">
      {ok ? (
        <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 text-primary" />
      ) : (
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0 text-destructive" />
      )}
      <span>{text}</span>
    </div>
  );
}
