"use client";

import { AlertTriangle, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Offer, OfferKbArticle } from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";
import { Slot } from "@solivio/slots";
import { Alert, AlertDescription } from "@solivio/ui/components/alert.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@solivio/ui/components/card.tsx";

import { CommercialTotals } from "./CommercialTotals";
import type { DraftLine } from "./offer-builder-types";

declare module "@solivio/sdk" {
  interface SlotPropsMap {
    "offers.summary.kbArticles": { kbArticles: OfferKbArticle[] };
  }
}

type OfferSummaryProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  notes: Offer["notes"];
  kbArticles?: OfferKbArticle[];
  requestText: string;
  setDiscountPercent: (discountPercent: number) => void;
  status: Offer["status"];
  subtotal: number;
  total: number;
};

export function OfferSummary({
  currency,
  discount,
  discountPercent,
  notes,
  kbArticles = [],
  requestText,
  setDiscountPercent,
  status,
  subtotal,
  total,
}: OfferSummaryProps) {
  const tSummary = useTranslations("offers.newOffer.review.summary");

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
            <div className="max-h-[14.5rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-foreground/15 bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground">
              {requestText}
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">{tSummary("notes")}</h2>
              <div className="grid gap-2">
                {notes.map((note) => (
                  <Alert key={note}>
                    <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-primary" />
                    <AlertDescription className="text-sm leading-relaxed">{note}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </section>
          ) : null}

          <Slot id="offers.summary.kbArticles" kbArticles={kbArticles} />
        </div>

        <CommercialTotals
          currency={currency}
          discount={discount}
          discountPercent={discountPercent}
          setDiscountPercent={setDiscountPercent}
          subtotal={subtotal}
          total={total}
          isLocked={status === OFFER_STATUS.ACCEPTED}
        />
      </CardContent>
    </Card>
  );
}
