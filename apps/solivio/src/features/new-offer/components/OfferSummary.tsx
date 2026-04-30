import { AlertTriangle, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Offer } from "@solivio/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommercialTotals } from "./CommercialTotals";
import { ValidationRow } from "./ValidationRow";
import type { DraftLine } from "./offer-builder-types";

type OfferSummaryProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  limitedLineCount: number;
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
  notes,
  requestText,
  setDiscountPercent,
  status,
  subtotal,
  total,
  unpricedLineCount,
}: OfferSummaryProps) {
   const tSummary = useTranslations("NewOffer.review.summary");
  return (
    <Card className="min-w-0 border border-foreground/15 shadow-sm ring-0" size="sm">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2">
          <FileText size={16} aria-hidden="true" className="text-primary" />
          {tSummary("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-4">
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">{tSummary("customerRequest")}</h2>
            <div className="max-h-[14.5rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{requestText}</div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-sm font-medium">{tSummary("reviewChecks")}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <ValidationRow
                ok={unpricedLineCount === 0}
                text={
                  unpricedLineCount === 0
                    ? tSummary("checks.allPriced")
                    : tSummary("checks.missingPrice", { count: unpricedLineCount })
                }
              />
              <ValidationRow
                ok={limitedLineCount === 0}
                text={
                  limitedLineCount === 0
                    ? tSummary("checks.availabilityConfirmed")
                    : tSummary("checks.missingAvailability", { count: limitedLineCount })
                }
              />
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">{tSummary("notes")}</h2>
              <div className="grid gap-2">
                {notes.map((note) => (
                  <div key={note} className="flex gap-2 rounded-lg border border-foreground/15 bg-background/60 p-3 text-sm leading-relaxed">
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
          setDiscountPercent={setDiscountPercent}
          subtotal={subtotal}
          total={total}
          isLocked={status === "accepted"}
        />
      </CardContent>
    </Card>
  );
}
