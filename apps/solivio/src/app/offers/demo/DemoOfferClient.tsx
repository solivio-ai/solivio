"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ProductSearchDialog,
  type ProductSearchMatch,
} from "@/features/product-search";

type OfferItem = { product: ProductSearchMatch; quantity: number };

export function DemoOfferClient() {
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
    Object.entries(items).map(([id, item]) => [id, item.quantity])
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Offer products</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          Add product
        </Button>
      </div>

      {addedList.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No products added yet</p>
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
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.product.sku}
                </span>
              </div>
              <span className="text-sm text-primary">qty: {item.quantity}</span>
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
