import { useTranslations } from "next-intl";

import { Input } from "@solivio/ui/components/input.tsx";

import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

type CommercialTotalsProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  setDiscountPercent: (discountPercent: number) => void;
  subtotal: number;
  total: number;
  isLocked?: boolean;
};

export function CommercialTotals({
  currency,
  discount,
  discountPercent,
  setDiscountPercent,
  subtotal,
  total,
  isLocked,
}: CommercialTotalsProps) {
  const tCommercial = useTranslations("offers.newOffer.review.commercial");
  return (
    <section className="grid min-w-0 content-start gap-3 rounded-lg border border-foreground/15 bg-background/60 p-3">
      <h2 className="text-sm font-medium">{tCommercial("title")}</h2>
      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{tCommercial("subtotal")}</span>
          <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-muted-foreground" htmlFor="discount-percent">
            {tCommercial("discount")}
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
              disabled={isLocked}
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-foreground/15 pt-3">
          <span className="text-muted-foreground">{tCommercial("discountValue")}</span>
          <span className="font-medium">{formatCurrency(discount, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-base">
          <span className="font-medium">{tCommercial("totalNet")}</span>
          <span className="text-lg font-semibold">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </section>
  );
}
