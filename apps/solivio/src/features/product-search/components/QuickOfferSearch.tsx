"use client";

import { PackageSearch, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductSearchMatch } from "@/features/product-search";
import { ProductSearchDialog } from "@/features/product-search";

export function QuickOfferSearch() {
  const t = useTranslations("QuickSearch");
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
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
        body: JSON.stringify({ items, customerName }),
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
      <Card className="bg-card/80 shadow-sm" size="sm">
        <CardContent className="grid h-full gap-3 py-1 lg:flex lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-secondary/20 bg-secondary/10 text-secondary dark:text-sidebar-foreground">
              <PackageSearch size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base">{t("card.title")}</CardTitle>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {t("card.description")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start text-muted-foreground lg:w-48 xl:w-64"
            onClick={() => setOpen(true)}
          >
            <Search size={16} aria-hidden="true" />
            {t("searchPlaceholder")}
          </Button>
        </CardContent>
      </Card>

      <ProductSearchDialog
        open={open}
        onOpenChange={setOpen}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        renderFooter={
          <div className="flex flex-col gap-3 pt-4 border-t w-full mt-auto">
            <div className="grid gap-2">
              <Label htmlFor="quick-offer-customer-name">{t("customerName.label")}</Label>
              <Input
                id="quick-offer-customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t("customerName.placeholder")}
                className="bg-background/60"
                disabled={isCreating}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground font-medium">
                {selectedCount > 0 ? (
                  <span className="text-primary">
                    {t("itemsSelected", { count: selectedCount })}
                  </span>
                ) : (
                  t("noItemsSelected")
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("actions.cancel")}
                </Button>
                <Button
                  disabled={selectedCount === 0 || isCreating || !customerName.trim()}
                  onClick={handleCreateOffer}
                >
                  {isCreating ? t("actions.creating") : t("actions.createDraft")}
                </Button>
              </div>
            </div>
          </div>
        }
      />
    </>
  );
}
