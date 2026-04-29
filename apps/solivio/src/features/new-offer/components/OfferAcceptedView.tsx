"use client";

import Link from "next/link";
import { ArrowLeft, Download, User } from "lucide-react";

import type { Offer } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DraftLine } from "./offer-builder-types";

type OfferAcceptedViewProps = {
  offer: Offer;
  onBackToDraft: () => void;
};

function toDraftLines(offer: Offer): DraftLine[] {
  return offer.items.map((item) => ({
    offerProductId: item.offerProductId,
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
    rationale: item.rationale,
  }));
}

function downloadPdf(offerId: string) {
  window.open(`/api/offers/${offerId}/pdf?download=1`, "_blank", "noopener,noreferrer");
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ` ${currency}`;
}

export function OfferAcceptedView({ offer, onBackToDraft }: OfferAcceptedViewProps) {
  const lines = toDraftLines(offer);
  const currency = lines[0]?.currency ?? "PLN";
  const subtotal = lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const discount = 0;
  const total = subtotal;
  const estimatedCost = subtotal * 0.7;
  const margin = total > 0 ? ((total - estimatedCost) / total) * 100 : 0;

  return (
    <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-h-[60vh] overflow-hidden rounded-lg border bg-card">
        <iframe
          title="Accepted offer PDF preview"
          src={`/api/offers/${offer.id}/pdf`}
          className="h-[72vh] w-full"
        />
      </article>

      <aside className="grid min-h-0 content-start gap-3">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Commercial totals</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">{discount}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount value</span>
              <span className="font-medium">
                {formatMoney(subtotal * (discount / 100), currency)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total net</span>
              <span>
                {formatMoney(total, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated margin</span>
              <Badge variant={margin < 10 ? "destructive" : "secondary"}>
                {margin.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </section>

        {(offer.createdBy?.name || offer.updatedBy?.name) && (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Attribution</h2>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {offer.createdBy?.name && (
                <span
                  className="flex items-center gap-1.5"
                  title={new Date(offer.generatedAt).toLocaleString("pl-PL")}
                >
                  <User size={11} aria-hidden="true" />
                  Created by {offer.createdBy.name}
                </span>
              )}
              {offer.updatedBy?.name && (
                <span
                  className="flex items-center gap-1.5"
                  title={offer.updatedAt ? new Date(offer.updatedAt).toLocaleString("pl-PL") : undefined}
                >
                  <User size={11} aria-hidden="true" />
                  Last modified by {offer.updatedBy.name}
                </span>
              )}
            </div>
          </section>
        )}

        <div className="grid w-full max-w-sm content-start auto-rows-min gap-2 self-start rounded-lg border bg-card p-3">
          <Button onClick={() => downloadPdf(offer.id)}>
            <Download size={16} aria-hidden="true" />
            Generate and download PDF
          </Button>
          <Button variant="outline" onClick={onBackToDraft}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to draft
          </Button>
          <Button
            asChild
            variant="outline"
            className="justify-center"
          >
            <Link href="/offers">Go to offers list</Link>
          </Button>
        </div>
      </aside>
    </section>
  );
}
