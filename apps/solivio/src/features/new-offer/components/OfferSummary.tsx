import { AlertTriangle } from "lucide-react";

import type { Offer } from "@solivio/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommercialTotals } from "./CommercialTotals";
import { ValidationRow } from "./ValidationRow";
import type { DraftLine } from "./offer-builder-types";

type OfferSummaryProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  limitedLineCount: number;
  margin: number;
  notes: Offer["notes"];
  requestText: string;
  setDiscountPercent: (discountPercent: number) => void;
  status: Offer["status"];
  subtotal: number;
  total: number;
  unpricedLineCount: number;
};

export function OfferSummary({
  currency,
  discount,
  discountPercent,
  limitedLineCount,
  margin,
  notes,
  requestText,
  setDiscountPercent,
  status,
  subtotal,
  total,
  unpricedLineCount,
}: OfferSummaryProps) {
  return (
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
                ok={unpricedLineCount === 0}
                text={
                  unpricedLineCount === 0
                    ? "All lines have prices"
                    : `${unpricedLineCount} line needs a unit price`
                }
              />
              <ValidationRow
                ok={limitedLineCount === 0}
                text={
                  limitedLineCount === 0
                    ? "Availability confirmed"
                    : `${limitedLineCount} line needs availability confirmation`
                }
              />
              <ValidationRow ok={status !== "draft"} text="Sales review marked complete" />
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">Notes</h2>
              <div className="grid gap-2">
                {notes.map((note) => (
                  <div key={note} className="flex gap-2 rounded-lg border bg-background/60 p-3 text-sm leading-relaxed">
                    <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <CommercialTotals
          currency={currency}
          discount={discount}
          discountPercent={discountPercent}
          margin={margin}
          setDiscountPercent={setDiscountPercent}
          subtotal={subtotal}
          total={total}
        />
      </CardContent>
    </Card>
  );
}
