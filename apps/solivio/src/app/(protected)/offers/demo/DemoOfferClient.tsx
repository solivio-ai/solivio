"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductSearchMatch } from "@/features/product-search";
import { ProductSearchDialog } from "@/features/product-search";

type OfferItem = { product: ProductSearchMatch; quantity: number };

export function DemoOfferClient() {
  const t = useTranslations("DemoOffer");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Record<string, OfferItem>>({});

  function handleQuantityChange(product: ProductSearchMatch, quantity: number) {
    setItems((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return { ...prev, [product.id]: { product, quantity } };
    });
  }

  const addedList = Object.values(items);
  const quantities = Object.fromEntries(
    Object.entries(items).map(([id, item]) => [id, item.quantity]),
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          {t("addProduct")}
        </Button>
      </div>

      {addedList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {addedList.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium">{item.product.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.product.sku}</span>
              </div>
              <span className="text-sm text-primary">{t("qty", { count: item.quantity })}</span>
            </div>
          ))}
        </div>
      )}

      <ProductSearchDialog
        open={open}
        onOpenChange={setOpen}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
      />
    </div>
  );
}
