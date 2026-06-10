"use client";

import { useCallback, useRef, useState } from "react";

import type { SearchableField } from "../searchableFields";

export type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
};

export type { SearchableField } from "../searchableFields";
export { ALL_SEARCHABLE_FIELDS } from "../searchableFields";

type State = {
  results: ProductSearchMatch[];
  totalCount: number | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  hasMore: boolean;
};

const INITIAL_STATE: State = {
  results: [],
  totalCount: null,
  isLoading: false,
  error: null,
  hasSearched: false,
  hasMore: false,
};

const PAGE_SIZE = 20;

async function fetchPage(
  query: string,
  offset: number,
  searchFields?: SearchableField[],
): Promise<{ products: ProductSearchMatch[]; totalCount: number }> {
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
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string | { message?: string };
    } | null;
    const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message;

    if (response.status === 401) {
      throw new Error("Your session expired. Sign in again to search products.");
    }

    throw new Error(message ?? `Product search failed with HTTP ${response.status}.`);
  }
  return (await response.json()) as {
    products: ProductSearchMatch[];
    totalCount: number;
  };
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
  const requestIdRef = useRef(0);
  const searchFieldsRef = useRef(searchFields);
  searchFieldsRef.current = searchFields;

  const resetSearch = useCallback(() => {
    requestIdRef.current += 1;
    currentQueryRef.current = "";
    offsetRef.current = 0;
    isLoadingRef.current = false;
    hasMoreRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    currentQueryRef.current = trimmed;
    offsetRef.current = 0;
    isLoadingRef.current = true;
    hasMoreRef.current = false;

    setState({
      results: [],
      totalCount: null,
      isLoading: true,
      error: null,
      hasSearched: false,
      hasMore: false,
    });

    try {
      const { products, totalCount } = await fetchPage(trimmed, 0, searchFieldsRef.current);
      if (requestId !== requestIdRef.current) return;
      const hasMore = products.length < totalCount;
      offsetRef.current = products.length;
      hasMoreRef.current = hasMore;
      isLoadingRef.current = false;
      setState({
        results: products,
        totalCount,
        isLoading: false,
        error: null,
        hasSearched: true,
        hasMore,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      isLoadingRef.current = false;
      setState({
        results: [],
        totalCount: null,
        isLoading: false,
        error: err instanceof Error ? err.message : "Search failed.",
        hasSearched: true,
        hasMore: false,
      });
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!currentQueryRef.current || isLoadingRef.current || !hasMoreRef.current) return;
    const requestId = requestIdRef.current;

    isLoadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { products, totalCount } = await fetchPage(
        currentQueryRef.current,
        offsetRef.current,
        searchFieldsRef.current,
      );
      if (requestId !== requestIdRef.current) return;
      const nextOffset = offsetRef.current + products.length;
      const hasMore = nextOffset < totalCount;
      offsetRef.current = nextOffset;
      hasMoreRef.current = hasMore;
      isLoadingRef.current = false;
      setState((prev) => ({
        ...prev,
        results: [...prev.results, ...products],
        totalCount,
        isLoading: false,
        hasMore,
      }));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      isLoadingRef.current = false;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Load more failed.",
      }));
    }
  }, []);

  return { query, setQuery, ...state, search, loadMore, resetSearch };
}
