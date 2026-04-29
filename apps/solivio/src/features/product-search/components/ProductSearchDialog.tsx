"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fieldLabel, ALL_SEARCHABLE_FIELDS } from "../searchableFields";
import type { ProductSearchMatch, SearchableField } from "../hooks/useProductSearch";
import { useProductSearch } from "../hooks/useProductSearch";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantities: Record<string, number>;
  onQuantityChange: (product: ProductSearchMatch, quantity: number) => void;
  /** Initial set of columns to search. Defaults to all. */
  searchFields?: SearchableField[];
  /** Override how each result row's info section is rendered. Defaults to sku + name. */
  renderProductInfo?: (product: ProductSearchMatch) => React.ReactNode;
  /** Optional footer content. */
  renderFooter?: React.ReactNode;
};

function defaultProductInfo(product: ProductSearchMatch) {
  return (
    <>
      <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
      <p className="truncate text-sm font-medium">{product.name}</p>
    </>
  );
}

export function ProductSearchDialog({
  open,
  onOpenChange,
  quantities,
  onQuantityChange,
  searchFields,
  renderProductInfo = defaultProductInfo,
  renderFooter,
}: Props) {
  const [selectedFields, setSelectedFields] = useState<SearchableField[]>(
    [...(searchFields ?? ALL_SEARCHABLE_FIELDS)]
  );

  const { query, setQuery, results, totalCount, isLoading, error, hasSearched, hasMore, search, loadMore, resetSearch } =
    useProductSearch({ searchFields: selectedFields });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (!trimmed) {
      resetSearch();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void search(trimmed);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [open, query, resetSearch, search, selectedFields]);

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
  }, [results.length, hasMore]);

  function toggleField(field: SearchableField) {
    setSelectedFields((prev) => {
      if (prev.includes(field)) {
        if (prev.length === 1) return prev; // keep at least one active
        return prev.filter((f) => f !== field);
      }
      return [...prev, field];
    });
  }

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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-[min(920px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Search products</DialogTitle>
          <DialogDescription>
            Search the catalog and adjust quantities before adding products to the offer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products…"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => search(query)}
            aria-label="Search"
          >
            <Search size={16} aria-hidden="true" />
          </Button>
        </div>

        <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Search in:</span>
            {ALL_SEARCHABLE_FIELDS.map((field) => {
              const active = selectedFields.includes(field);
              return (
                <Button
                  key={field}
                  size="xs"
                  variant={active ? "default" : "outline"}
                  onClick={() => toggleField(field)}
                  aria-pressed={active}
                >
                  {fieldLabel(field)}
                </Button>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {totalCount !== null && totalCount > 0 ? (
              <span>{totalCount} products found</span>
            ) : isLoading ? (
              <span>Searching...</span>
            ) : null}
          </div>
        </div>

        {/* Scrollable results */}
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
                    <div className="min-w-0 flex-1">{renderProductInfo(product)}</div>
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
        {renderFooter}
      </DialogContent>
    </Dialog>
  );
}
