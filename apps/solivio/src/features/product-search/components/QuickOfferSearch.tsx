"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductSearchDialog, type ProductSearchMatch } from "@/features/product-search";

export function QuickOfferSearch() {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  function handleQuantityChange(product: ProductSearchMatch, quantity: number) {
    setQuantities((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return { ...prev, [product.id]: quantity };
    });
  }

  async function handleCreateOffer() {
    const items = Object.entries(quantities).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    if (items.length === 0) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/offers/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/offers/${data.offer.id}`);
      }
    } catch (error) {
      console.error("Failed to create quick offer", error);
    } finally {
      setIsCreating(false);
    }
  }

  const selectedCount = Object.values(quantities).reduce((acc, qty) => acc + qty, 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Find a product</CardTitle>
          <CardDescription>
            Search the catalog and create a draft offer from selected items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setOpen(true)}>
            <Search size={16} className="mr-2" />
            Search products...
          </Button>
        </CardContent>
      </Card>

      <ProductSearchDialog
        open={open}
        onOpenChange={setOpen}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        renderFooter={
          <div className="flex items-center justify-between gap-4 pt-4 border-t w-full mt-auto">
            <div className="text-sm text-muted-foreground font-medium">
              {selectedCount > 0 ? (
                <span className="text-primary">{selectedCount} items selected</span>
              ) : (
                "No items selected"
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button 
                disabled={selectedCount === 0 || isCreating} 
                onClick={handleCreateOffer}
              >
                {isCreating ? "Creating..." : "Create Draft Offer"}
              </Button>
            </div>
          </div>
        }
      />
    </>
  );
}
