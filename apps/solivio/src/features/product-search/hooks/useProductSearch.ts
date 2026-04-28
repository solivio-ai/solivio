"use client";

import { useRef, useState } from "react";

export type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

type State = {
  results: ProductSearchMatch[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  hasMore: boolean;
};

const INITIAL_STATE: State = {
  results: [],
  isLoading: false,
  error: null,
  hasSearched: false,
  hasMore: false,
};

const PAGE_SIZE = 20;

async function fetchPage(query: string, offset: number): Promise<ProductSearchMatch[]> {
  const response = await fetch("/api/products/text-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: PAGE_SIZE, offset }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as { products: ProductSearchMatch[] };
  return json.products;
}

export function useProductSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>(INITIAL_STATE);

  // Refs prevent stale closures in loadMore without needing useCallback
  const currentQueryRef = useRef("");
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(false);

  async function search(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    currentQueryRef.current = trimmed;
    offsetRef.current = 0;
    isLoadingRef.current = true;
    hasMoreRef.current = false;

    setState({ results: [], isLoading: true, error: null, hasSearched: false, hasMore: false });

    try {
      const products = await fetchPage(trimmed, 0);
      const hasMore = products.length === PAGE_SIZE;
      offsetRef.current = products.length;
      hasMoreRef.current = hasMore;
      isLoadingRef.current = false;
      setState({ results: products, isLoading: false, error: null, hasSearched: true, hasMore });
    } catch (err) {
      isLoadingRef.current = false;
      setState({
        results: [],
        isLoading: false,
        error: err instanceof Error ? err.message : "Search failed.",
        hasSearched: true,
        hasMore: false,
      });
    }
  }

  async function loadMore() {
    if (!currentQueryRef.current || isLoadingRef.current || !hasMoreRef.current) return;

    isLoadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const products = await fetchPage(currentQueryRef.current, offsetRef.current);
      const hasMore = products.length === PAGE_SIZE;
      offsetRef.current += products.length;
      hasMoreRef.current = hasMore;
      isLoadingRef.current = false;
      setState((prev) => ({
        ...prev,
        results: [...prev.results, ...products],
        isLoading: false,
        hasMore,
      }));
    } catch (err) {
      isLoadingRef.current = false;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Load more failed.",
      }));
    }
  }

  return { query, setQuery, ...state, search, loadMore };
}
