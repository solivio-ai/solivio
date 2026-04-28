"use client";

import { useEffect, useRef } from "react";
import { Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSearchMatch } from "../hooks/useProductSearch";
import { useProductSearch } from "../hooks/useProductSearch";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantities: Record<string, number>;
  onQuantityChange: (product: ProductSearchMatch, quantity: number) => void;
};

export function ProductSearchDialog({ open, onOpenChange, quantities, onQuantityChange }: Props) {
  const { query, setQuery, results, isLoading, error, hasSearched, hasMore, search, loadMore } =
    useProductSearch();

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [results.length, hasMore]); // re-attach when list grows so sentinel is rechecked

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") search(query);
  }

  function increment(product: ProductSearchMatch) {
    onQuantityChange(product, (quantities[product.id] ?? 0) + 1);
  }

  function decrement(product: ProductSearchMatch) {
    onQuantityChange(product, Math.max(0, (quantities[product.id] ?? 0) - 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override sm:max-w-sm with max-w-2xl; overflow-hidden prevents horizontal bleed */}
      <DialogContent className="sm:max-w-[75vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Search products</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, SKU, or manufacturer…"
            disabled={isLoading && results.length === 0}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => search(query)}
            disabled={isLoading && results.length === 0}
            aria-label="Search"
          >
            <Search size={16} aria-hidden="true" />
          </Button>
        </div>

        {/* Scrollable results area — max-h keeps the dialog from growing past the viewport */}
        <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden">
          {results.length > 0 && (
            <div className="grid gap-2 pb-2">
              {results.map((product) => {
                const qty = quantities[product.id] ?? 0;
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.sku} · {product.manufacturer}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        onClick={() => decrement(product)}
                        disabled={qty === 0}
                        aria-label={`Decrease quantity for ${product.name}`}
                      >
                        <Minus size={12} aria-hidden="true" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        onClick={() => increment(product)}
                        aria-label={`Increase quantity for ${product.name}`}
                      >
                        <Plus size={12} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Sentinel for IntersectionObserver — triggers loadMore when scrolled into view */}
              {hasMore && <div ref={sentinelRef} className="h-1" />}
            </div>
          )}

          {isLoading && (
            <div className="grid gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {!isLoading && error && (
            <p className="py-2 text-sm text-destructive">{error}</p>
          )}

          {!isLoading && hasSearched && results.length === 0 && !error && (
            <p className="py-4 text-center text-sm text-muted-foreground">No results found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
