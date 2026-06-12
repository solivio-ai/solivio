import { AlertTriangle, Info, Loader2, PackageSearch, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Offer } from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@solivio/ui/components/accordion.tsx";
import { Alert, AlertDescription, AlertTitle } from "@solivio/ui/components/alert.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@solivio/ui/components/card.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@solivio/ui/components/table.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";
import { ProductLineCard } from "./ProductLineCard";
import { UnmatchedItem } from "./UnmatchedItem";

type OfferProductsReviewProps = {
  commitQuantity: (productId: string) => void;
  lines: DraftLine[];
  unmatched: string[];
  pendingProductIds: Set<string>;
  removeProduct: (productId: string) => void;
  removeUnmatched: (item: string) => void;
  onManuallyMatch: (item: string) => void;
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
  removeUnmatched,
  onManuallyMatch,
  updateQuantity,
  status,
}: OfferProductsReviewProps) {
  const tProducts = useTranslations("offers.newOffer.review.products");
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

  const isLocked = status === OFFER_STATUS.ACCEPTED;

  return (
    <Card className="min-w-0 border border-foreground/15 shadow-sm ring-0" size="sm">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <PackageSearch size={18} aria-hidden="true" className="text-primary" />
          <CardTitle>{tProducts("title")}</CardTitle>
        </div>
        <CardDescription>{tProducts("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        {unmatched && unmatched.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle size={16} aria-hidden="true" />
            <AlertTitle>{tProducts("unmatchedTitle")}</AlertTitle>
            <AlertDescription className="mt-0 space-y-2">
              <p>{tProducts("unmatchedDescription")}</p>
              <ul className="text-sm space-y-1 list-none p-0 m-0">
                {unmatched.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-foreground">
                    <UnmatchedItem
                      item={item}
                      modifyEnabled={!isLocked}
                      onDelete={removeUnmatched}
                      onManuallyMatch={onManuallyMatch}
                    />
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 md:hidden">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-foreground/15 p-8 text-center text-sm text-muted-foreground">
              {tProducts("empty")}
            </div>
          ) : (
            lines.map((line) => (
              <div
                key={line.productId}
                className={cn(
                  "rounded-lg transition-colors duration-700",
                  updatedLineIds.has(line.productId) ? "bg-primary/10" : "bg-transparent",
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

        <div className="hidden rounded-lg border border-foreground/15 bg-background md:block">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[54%] min-w-[320px]">{tProducts("match")}</TableHead>
                <TableHead className="w-24 text-right">{tProducts("qty")}</TableHead>
                <TableHead className="w-28 text-right">{tProducts("unitPrice")}</TableHead>
                <TableHead className="w-32 text-right">{tProducts("lineTotal")}</TableHead>
                <TableHead className="w-10 text-right">
                  <span className="sr-only">{tProducts("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                    {tProducts("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow
                    key={line.productId}
                    className={cn(
                      "transition-colors duration-700",
                      updatedLineIds.has(line.productId) ? "bg-primary/10" : "",
                    )}
                  >
                    <TableCell className="whitespace-normal py-3 pr-4">
                      <div className="grid gap-1">
                        {/* Always visible: name, SKU, requested item */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold">{line.name}</span>
                          {line.sku ? (
                            <span className="text-xs text-muted-foreground">
                              {tProducts("sku")}: {line.sku}
                            </span>
                          ) : null}
                        </div>
                        {line.requestItem
                          ? (() => {
                              const fragments = line
                                .requestItem!.split(" + ")
                                .map((f) => f.trim())
                                .filter(Boolean);
                              const isMerged = fragments.length > 1;
                              return (
                                <div className="mt-1 grid gap-1 rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 text-xs">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="shrink-0 font-medium text-secondary">
                                      {tProducts("requested")}:
                                    </span>
                                    {isMerged ? (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      >
                                        {tProducts("mergedBadge", { count: fragments.length })}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {isMerged ? (
                                    <ul className="grid gap-0.5 pl-1">
                                      {fragments.map((f, i) => (
                                        <li key={i} className="italic text-foreground">
                                          • {f}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="italic text-foreground">
                                      {line.requestItem}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          : null}

                        {/* Collapsible details */}
                        {line.availability || line.rationale ? (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="details" className="border-none">
                              <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
                                {tProducts("details")}
                              </AccordionTrigger>
                              <AccordionContent className="grid gap-2 pb-0">
                                {line.availability ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {tProducts("availability")}:
                                    </span>
                                    <Badge
                                      variant={
                                        line.availability === "limited"
                                          ? "secondary"
                                          : line.availability === "unavailable"
                                            ? "destructive"
                                            : "outline"
                                      }
                                    >
                                      {line.availability}
                                    </Badge>
                                  </div>
                                ) : null}
                                {line.rationale ? (
                                  <div className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                                    <Info size={14} className="mt-0.5 shrink-0 text-primary/70" />
                                    <p>{line.rationale}</p>
                                  </div>
                                ) : null}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <Input
                        aria-label={tProducts("quantityAria", { name: line.name })}
                        className="ml-auto w-20 text-right"
                        min={1}
                        max={10000}
                        type="number"
                        value={line.quantity}
                        onChange={(event) =>
                          updateQuantity(
                            line.productId,
                            Math.min(10000, Math.max(1, Number(event.target.value) || 1)),
                          )
                        }
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
                      <span className="text-sm">
                        {formatCurrency(line.unitPrice, line.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold align-top pt-4">
                      {formatCurrency(line.quantity * line.unitPrice, line.currency)}
                    </TableCell>
                    <TableCell className="w-10 text-right align-top pt-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProduct(line.productId)}
                        disabled={pendingProductIds.has(line.productId) || isLocked}
                        aria-label={tProducts("removeAria", { name: line.name })}
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
