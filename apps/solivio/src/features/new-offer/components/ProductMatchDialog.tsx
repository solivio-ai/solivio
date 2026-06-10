"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@solivio/ui/components/alert.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
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
          <Alert variant={selectedProduct ? "success" : "warning"}>
            {selectedProduct ? <CheckCircle2 aria-hidden /> : <AlertTriangle aria-hidden />}
            <AlertTitle className="break-words">
              {t("matchingItem", { item: unmatchedItem })}
            </AlertTitle>
            <AlertDescription>
              {selectedProduct
                ? t("matchSelectedProduct", {
                    name: selectedProduct.name,
                    quantity,
                  })
                : t("matchSelectPrompt")}
            </AlertDescription>
          </Alert>
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
