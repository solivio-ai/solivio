"use client";

import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Offer } from "@solivio/domain";
import { hasSlotContribution, Slot } from "@solivio/slots";
import { Button } from "@solivio/ui/components/button.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

import { calculateNetTotal, calculateSubtotalNet } from "../../../lib/offerTotals.ts";
import type { DraftLine } from "./offer-builder-types";

type OfferAcceptedViewProps = {
  offer: Offer;
  onBackToDraft: () => void;
  /** Which module backs the `offer` channel; `null` if none is bound unambiguously. */
  channelModuleId: string | null;
};

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

function formatMoney(value: number, currency: string) {
  return `${new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
}

/**
 * The accepted-offer screen. Offers owns the chrome — totals, attribution,
 * back/exit navigation — and stays ignorant of what any module does with a
 * finalized offer. Two slots differ deliberately (see
 * `docs/adr/0005-channels-output-capability.md`):
 *
 * - `offer-detail.document` is **exclusive**, restricted to `channelModuleId`,
 *   because one preview owns that column.
 * - `offer-detail.actions` is **additive**: every contributing module's button
 *   renders, so a PDF download and a push to another system coexist.
 */
export function OfferAcceptedView({
  offer,
  onBackToDraft,
  channelModuleId,
}: OfferAcceptedViewProps) {
  const t = useTranslations("offers.newOffer.builder");
  const tAccepted = useTranslations("offers.newOffer.review.acceptedView");
  const tCommercial = useTranslations("offers.newOffer.review.commercial");
  const lines = toDraftLines(offer);
  const currency = lines[0]?.currency ?? offer.currency;
  const subtotal = calculateSubtotalNet(
    lines.map((l) => ({ quantity: l.quantity, unitPriceNet: l.unitPrice })),
  );
  const discountPercent = offer.discountPercent;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = calculateNetTotal(subtotal, discountPercent);
  const hasDocument =
    channelModuleId !== null && hasSlotContribution("offer-detail.document", channelModuleId);

  return (
    <section
      className={cn("grid min-h-0 gap-4", hasDocument && "xl:grid-cols-[minmax(0,1fr)_380px]")}
    >
      {hasDocument && (
        <article className="min-h-[60vh] overflow-hidden rounded-lg border bg-card">
          <Slot id="offer-detail.document" providerId={channelModuleId} offer={offer} />
        </article>
      )}

      <aside
        className={cn(
          "grid min-h-0 content-start gap-3",
          !hasDocument && "mx-auto w-full max-w-md",
        )}
      >
        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">{tCommercial("title")}</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tCommercial("subtotal")}</span>
              <span className="font-medium">{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tCommercial("discount")}</span>
              <span className="font-medium">{discountPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tCommercial("discountValue")}</span>
              <span className="font-medium">{formatMoney(discountAmount, currency)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>{tCommercial("totalNet")}</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </section>

        {offer.userName && (
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">{tAccepted("attribution")}</h2>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <span
                className="flex items-center gap-1.5"
                title={new Date(offer.createdAt).toLocaleString("pl-PL")}
              >
                <User size={11} aria-hidden="true" />
                {t("createdBy", { name: offer.userName })}
              </span>
            </div>
          </section>
        )}

        <div className="grid w-full max-w-sm content-start auto-rows-min gap-2 self-start rounded-lg border bg-card p-3">
          <Slot id="offer-detail.actions" offer={offer} />
          <Button variant="outline" onClick={onBackToDraft}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t("backToDraft")}
          </Button>
          <Button asChild variant="outline" className="justify-center">
            <Link href="/offers">{tAccepted("goToOffers")}</Link>
          </Button>
        </div>
      </aside>
    </section>
  );
}
