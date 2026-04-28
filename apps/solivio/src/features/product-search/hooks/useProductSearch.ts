"use client";

import { useRef, useState } from "react";
import type { SearchableField } from "../searchableFields";

export type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

export type { SearchableField } from "../searchableFields";
export { ALL_SEARCHABLE_FIELDS } from "../searchableFields";

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

async function fetchPage(
  query: string,
  offset: number,
  searchFields?: SearchableField[]
): Promise<ProductSearchMatch[]> {
  const response = await fetch("/api/products/text-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: PAGE_SIZE,
      offset,
      ...(searchFields?.length ? { searchFields } : {}),
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as { products: ProductSearchMatch[] };
  return json.products;
}

type Config = {
  searchFields?: SearchableField[];
};

export function useProductSearch({ searchFields }: Config = {}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>(INITIAL_STATE);

  const currentQueryRef = useRef("");
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const searchFieldsRef = useRef(searchFields);
  searchFieldsRef.current = searchFields;

  async function search(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    currentQueryRef.current = trimmed;
    offsetRef.current = 0;
    isLoadingRef.current = true;
    hasMoreRef.current = false;

    setState({ results: [], isLoading: true, error: null, hasSearched: false, hasMore: false });

    try {
      const products = await fetchPage(trimmed, 0, searchFieldsRef.current);
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
      const products = await fetchPage(
        currentQueryRef.current,
        offsetRef.current,
        searchFieldsRef.current
      );
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
