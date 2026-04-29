import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

type CommercialTotalsProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  margin: number;
  setDiscountPercent: (discountPercent: number) => void;
  subtotal: number;
  total: number;
};

export function CommercialTotals({
  currency,
  discount,
  discountPercent,
  margin,
  setDiscountPercent,
  subtotal,
  total,
}: CommercialTotalsProps) {
  return (
    <section className="grid min-w-0 content-start gap-4 rounded-lg border bg-background/60 p-4">
      <h2 className="text-sm font-medium">Commercial totals</h2>
      <div className="grid gap-3 text-sm">
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
        <div className="flex items-center justify-between gap-4 border-t pt-3">
          <span className="text-muted-foreground">Discount value</span>
          <span className="font-medium">{formatCurrency(discount, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-base">
          <span className="font-medium">Total net</span>
          <span className="text-lg font-semibold">{formatCurrency(total, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Estimated margin</span>
          <Badge variant={margin >= 28 ? "outline" : "destructive"}>{margin.toFixed(1)}%</Badge>
        </div>
      </div>
    </section>
  );
}
