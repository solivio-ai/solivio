import { Info, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DraftLine } from "./offer-builder-types";
import { formatCurrency } from "./offer-builder-types";

type ProductLineCardProps = {
  commitQuantity: (productId: string) => void;
  isPending?: boolean;
  isLocked?: boolean;
  line: DraftLine;
  removeProduct: (productId: string) => void;
  updateQuantity: (productId: string, nextQuantity: number) => void;
};

export function ProductLineCard({
  commitQuantity,
  isPending,
  isLocked,
  line,
  removeProduct,
  updateQuantity,
}: ProductLineCardProps) {
  const tProducts = useTranslations("NewOffer.review.products");
  const hasDetails = line.availability || line.manufacturer || line.rationale || line.description;

  return (
    <div className="rounded-lg border border-foreground/15 bg-background/60 p-3">
      {/* Always visible: name + SKU */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{line.name}</span>
        {line.sku ? (
          <span className="text-xs text-muted-foreground">
            {tProducts("sku")}: {line.sku}
          </span>
        ) : null}
      </div>

      {/* Highlighted requested item */}
      {line.requestItem ? (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 text-xs">
          <span className="shrink-0 font-medium text-secondary">{tProducts("requested")}:</span>
          <span className="italic text-foreground">{line.requestItem}</span>
        </div>
      ) : null}

      {/* Quantity / unit price / line total / remove */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(8rem,1fr)_auto_auto_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${line.productId}-quantity`}
          >
            {tProducts("qty")}
          </label>
          <Input
            id={`${line.productId}-quantity`}
            aria-label={tProducts("quantityAria", { name: line.name })}
            className="text-right"
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
            disabled={isPending || isLocked}
          />
        </div>
        <div className="grid gap-1.5 text-right">
          <span className="text-xs font-medium text-muted-foreground">
            {tProducts("unitPrice")}
          </span>
          <span className="flex h-9 items-center justify-end text-sm">
            {formatCurrency(line.unitPrice, line.currency)}
          </span>
        </div>
        <div className="grid gap-1.5 text-right">
          <span className="text-xs font-medium text-muted-foreground">
            {tProducts("lineTotal")}
          </span>
          <span className="flex h-9 items-center justify-end font-semibold">
            {formatCurrency(line.quantity * line.unitPrice, line.currency)}
          </span>
        </div>
        <div className="flex h-9 items-center justify-end self-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeProduct(line.productId)}
            disabled={isPending || isLocked}
            aria-label={tProducts("removeAria", { name: line.name })}
          >
            {isPending ? (
              <Loader2 size={14} aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 size={14} aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible details */}
      {hasDetails ? (
        <Accordion type="single" collapsible className="mt-1">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="py-1.5 text-xs text-muted-foreground hover:no-underline">
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
              {line.manufacturer ? (
                <span className="text-xs text-muted-foreground">
                  {tProducts("brand")}: {line.manufacturer}
                </span>
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
  );
}
