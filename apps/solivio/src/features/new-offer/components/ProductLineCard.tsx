import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

type ProductLineCardProps = {
  line: DraftLine;
  updateQuantity: (productId: string, nextQuantity: number) => void;
  updateUnitPrice: (productId: string, nextPrice: number) => void;
};

export function ProductLineCard({ line, updateQuantity, updateUnitPrice }: ProductLineCardProps) {
  return (
    <div className={`grid gap-4 rounded-lg border p-3 ${line.confidence < 80 ? "bg-muted/30" : "bg-background/60"}`}>
      <div className="grid gap-2">
        {line.requestItem && (
          <div className="flex flex-col gap-1 mb-1 bg-muted/50 p-2 rounded-md">
            <span className="text-xs font-medium text-muted-foreground">Requested:</span>
            <span className="text-sm italic">{line.requestItem}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{line.name}</span>
          {line.availability ? (
            <Badge variant={line.availability === "limited" ? "secondary" : line.availability === "unavailable" ? "destructive" : "outline"}>
              {line.availability}
            </Badge>
          ) : null}
          <Badge variant={line.confidence >= 90 ? "default" : line.confidence >= 70 ? "secondary" : "outline"}>
            {line.confidence}% Match
          </Badge>
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
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 mt-1 border-t pt-2">{line.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${line.productId}-quantity`}>
            Quantity
          </label>
          <Input
            id={`${line.productId}-quantity`}
            aria-label={`Quantity for ${line.name}`}
            className="text-right"
            min={1}
            type="number"
            value={line.quantity}
            onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${line.productId}-unit-price`}>
            Unit price
          </label>
          <Input
            id={`${line.productId}-unit-price`}
            aria-label={`Unit price for ${line.name}`}
            className="text-right"
            min={0}
            step="0.01"
            type="number"
            value={line.unitPrice}
            onChange={(event) => updateUnitPrice(line.productId, Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-3">
        <span className="text-sm text-muted-foreground">Line total</span>
        <span className="font-semibold">{formatCurrency(line.quantity * line.unitPrice, line.currency)}</span>
      </div>
    </div>
  );
}
