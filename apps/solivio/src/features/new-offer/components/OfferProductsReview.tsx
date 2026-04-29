import { PackageSearch, Info, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ProductLineCard } from "./ProductLineCard";
import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

type OfferProductsReviewProps = {
  lines: DraftLine[];
  unmatched: string[];
  updateQuantity: (productId: string, nextQuantity: number) => void;
  updateUnitPrice: (productId: string, nextPrice: number) => void;
};

export function OfferProductsReview({
  lines,
  unmatched,
  updateQuantity,
  updateUnitPrice,
}: OfferProductsReviewProps) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PackageSearch size={18} aria-hidden="true" className="text-primary" />
          <CardTitle>Products</CardTitle>
        </div>
        <CardDescription>Review the matched products, quantities, and pricing first.</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        {unmatched && unmatched.length > 0 && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-center gap-2 text-destructive mb-2 font-medium">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>Unmatched Request Items</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
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
                <TableHead className="w-[56%] min-w-[420px]">Product Match</TableHead>
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
                  <TableRow key={line.productId} className={line.confidence < 80 ? "bg-muted/30" : ""}>
                    <TableCell className="whitespace-normal py-4">
                      <div className="grid gap-2">
                        {line.requestItem && (
                           <div className="flex items-start gap-2 mb-2 bg-muted/50 p-2 rounded-md">
                             <div className="text-xs font-medium text-muted-foreground whitespace-nowrap mt-0.5">Requested:</div>
                             <div className="text-sm italic">{line.requestItem}</div>
                           </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold">{line.name}</span>
                          {line.availability ? (
                            <Badge variant={line.availability === "limited" ? "secondary" : line.availability === "unavailable" ? "destructive" : "outline"}>
                              {line.availability}
                            </Badge>
                          ) : null}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant={line.confidence >= 90 ? "default" : line.confidence >= 70 ? "secondary" : "outline"} className="ml-2">
                                  {line.confidence}% Match
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {line.confidence >= 90 ? "High confidence match based on request" : line.confidence >= 70 ? "Good potential match" : "Low confidence match, please review carefully"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {line.sku ? <span>SKU: {line.sku}</span> : null}
                          {line.manufacturer ? <span>Brand: {line.manufacturer}</span> : null}
                        </div>
                        
                        <div className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                          <Info size={14} className="mt-0.5 shrink-0 text-primary/70" />
                          <p>{line.rationale}</p>
                        </div>
                        
                        {line.description ? (
                          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 mt-1 border-t pt-2">
                            {line.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-5">
                      <Input
                        aria-label={`Quantity for ${line.name}`}
                        className="ml-auto w-20 text-right"
                        min={1}
                        type="number"
                        value={line.quantity}
                        onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right align-top pt-5">
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
                    <TableCell className="text-right text-base font-semibold align-top pt-5">
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
  );
}
