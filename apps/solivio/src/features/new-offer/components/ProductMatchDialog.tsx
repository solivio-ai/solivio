"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductSearchMatch } from "@/features/product-search";
import { ProductSearchDialog } from "@/features/product-search";

type ProductMatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmatchedItem: string;
  onConfirm: (product: ProductSearchMatch, quantity: number) => void;
};

export function ProductMatchDialog({
  open,
  onOpenChange,
  unmatchedItem,
  onConfirm,
}: ProductMatchDialogProps) {
  const t = useTranslations("NewOffer.builder");
  const tQuick = useTranslations("QuickSearch");
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchMatch | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open]);

  const quantities = useMemo(
    () => (selectedProduct ? { [selectedProduct.id]: quantity } : {}),
    [selectedProduct, quantity],
  );

  function handleQuantityChange(product: ProductSearchMatch, qty: number) {
    if (qty <= 0) {
      setSelectedProduct(null);
      setQuantity(1);
      return;
    }
    setSelectedProduct(product);
    setQuantity(qty);
  }

  function handleConfirm() {
    if (!selectedProduct) return;
    onConfirm(selectedProduct, quantity);
  }

  return (
    <ProductSearchDialog
      open={open}
      onOpenChange={onOpenChange}
      quantities={quantities}
      onQuantityChange={handleQuantityChange}
      renderFooter={
        <div className="grid w-full gap-3 pt-4 border-t mt-auto">
          <div
            className={
              selectedProduct
                ? "flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
                : "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
            }
          >
            {selectedProduct ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p
                className={
                  selectedProduct
                    ? "font-medium text-emerald-800 dark:text-emerald-200 break-words"
                    : "font-medium text-amber-800 dark:text-amber-200 break-words"
                }
              >
                {t("matchingItem", { item: unmatchedItem })}
              </p>
              <p className="text-muted-foreground mt-1">
                {selectedProduct
                  ? t("matchSelectedProduct", {
                      name: selectedProduct.name,
                      quantity,
                    })
                  : t("matchSelectPrompt")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tQuick("actions.cancel")}
            </Button>
            <Button type="button" disabled={!selectedProduct} onClick={handleConfirm}>
              {t("confirmMatch")}
            </Button>
          </div>
        </div>
      }
    />
  );
}
