import { useEffect, useRef, useState } from "react";
import { PackageSearch, Info, AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ProductLineCard } from "./ProductLineCard";
import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

import type { Offer } from "@solivio/domain";
 
 type OfferProductsReviewProps = {
   commitQuantity: (productId: string) => void;
   lines: DraftLine[];
   unmatched: string[];
   pendingProductIds: Set<string>;
   removeProduct: (productId: string) => void;
   updateQuantity: (productId: string, nextQuantity: number) => void;
   status: Offer["status"];
 };

function lineFingerprint(line: DraftLine) {
  return [
    line.productId,
    line.quantity,
    line.unitPrice,
    line.requestItem ?? "",
    line.rationale,
  ].join("|");
}

export function OfferProductsReview({
  commitQuantity,
  lines,
  unmatched,
  pendingProductIds,
  removeProduct,
  updateQuantity,
  status,
}: OfferProductsReviewProps) {
  const previousSignaturesRef = useRef<Map<string, string>>(new Map());
  const clearTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [updatedLineIds, setUpdatedLineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nextSignatures = new Map<string, string>();
    const changedIds = new Set<string>();

    for (const line of lines) {
      const signature = lineFingerprint(line);
      nextSignatures.set(line.productId, signature);

      const previousSignature = previousSignaturesRef.current.get(line.productId);
      if (previousSignature !== undefined && previousSignature !== signature) {
        changedIds.add(line.productId);
      }
    }

    previousSignaturesRef.current = nextSignatures;
    if (changedIds.size === 0) return;

    setUpdatedLineIds((current) => {
      const next = new Set(current);
      for (const id of changedIds) next.add(id);
      return next;
    });

    for (const id of changedIds) {
      const existingTimer = clearTimersRef.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);

      const timeoutId = setTimeout(() => {
        setUpdatedLineIds((current) => {
          if (!current.has(id)) return current;
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        clearTimersRef.current.delete(id);
      }, 1200);

      clearTimersRef.current.set(id, timeoutId);
    }
  }, [lines]);

  useEffect(() => {
    return () => {
      for (const timeoutId of clearTimersRef.current.values()) {
        clearTimeout(timeoutId);
      }
      clearTimersRef.current.clear();
    };
  }, []);

  const isLocked = status === "accepted";
 
  return (
    <Card className="min-w-0" size="sm">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <PackageSearch size={18} aria-hidden="true" className="text-primary" />
          <CardTitle>Products</CardTitle>
        </div>
        <CardDescription>Review the matched products, quantities, and pricing first.</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        {unmatched && unmatched.length > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <div className="flex items-center gap-2 text-destructive mb-1.5 font-medium">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>Unmatched Request Items</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              The following items from the customer's request could not be mapped to any products in our catalog:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {unmatched.map((item, idx) => (
                <li key={idx} className="text-foreground">{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-3 md:hidden">
          {lines.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              No products in this offer yet.
            </div>
          ) : (
            lines.map((line) => (
              <div
                key={line.productId}
                className={cn(
                  "rounded-lg transition-colors duration-700",
                  updatedLineIds.has(line.productId) ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <ProductLineCard
                  commitQuantity={commitQuantity}
                  isPending={pendingProductIds.has(line.productId)}
                  isLocked={isLocked}
                  line={line}
                  removeProduct={removeProduct}
                  updateQuantity={updateQuantity}
                />
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56%] min-w-[420px]">Product Match</TableHead>
                <TableHead className="w-28 text-right">Qty</TableHead>
                <TableHead className="w-36 text-right">Unit price</TableHead>
                <TableHead className="w-40 text-right">Line total</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                    No products in this offer yet.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow
                    key={line.productId}
                    className={cn(
                      "transition-colors duration-700",
                      updatedLineIds.has(line.productId) ? "bg-primary/10" : ""
                    )}
                  >
                    <TableCell className="whitespace-normal py-3">
                      <div className="grid gap-1">
                        {/* Always visible: name, SKU, requested item */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold">{line.name}</span>
                          {line.sku ? <span className="text-xs text-muted-foreground">SKU: {line.sku}</span> : null}
                        </div>
                        {line.requestItem ? (
        <div className="mt-1 flex items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs">
          <span className="font-medium text-green-600 shrink-0">Requested:</span>
          <span className="italic text-foreground">{line.requestItem}</span>
        </div>
                        ) : null}

                        {/* Collapsible details */}
                        {(line.availability || line.manufacturer || line.rationale || line.description) ? (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="details" className="border-none">
                              <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
                                Details
                              </AccordionTrigger>
                              <AccordionContent className="grid gap-2 pb-0">
                                {line.availability ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Availability:</span>
                                    <Badge variant={line.availability === "limited" ? "secondary" : line.availability === "unavailable" ? "destructive" : "outline"}>
                                      {line.availability}
                                    </Badge>
                                  </div>
                                ) : null}
                                {line.manufacturer ? (
                                  <span className="text-xs text-muted-foreground">Brand: {line.manufacturer}</span>
                                ) : null}
                                {line.rationale ? (
                                  <div className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                                    <Info size={14} className="mt-0.5 shrink-0 text-primary/70" />
                                    <p>{line.rationale}</p>
                                  </div>
                                ) : null}
                                {line.description ? (
                                  <p className="text-xs leading-relaxed text-muted-foreground border-t pt-2">
                                    {line.description}
                                  </p>
                                ) : null}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <Input
                        aria-label={`Quantity for ${line.name}`}
                        className="ml-auto w-20 text-right"
                        min={1}
                        type="number"
                        value={line.quantity}
                        onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
                        onBlur={() => commitQuantity(line.productId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        disabled={pendingProductIds.has(line.productId) || isLocked}
                      />
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <span className="text-sm">{formatCurrency(line.unitPrice, line.currency)}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold align-top pt-4">
                      {formatCurrency(line.quantity * line.unitPrice, line.currency)}
                    </TableCell>
                    <TableCell className="w-12 text-right align-top pt-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProduct(line.productId)}
                        disabled={pendingProductIds.has(line.productId) || isLocked}
                        aria-label={`Remove ${line.name}`}
                      >
                        {pendingProductIds.has(line.productId) ? (
                          <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                        ) : (
                          <Trash2 size={14} aria-hidden="true" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
