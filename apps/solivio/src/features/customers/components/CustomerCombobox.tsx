"use client";

import { Check, ChevronsUpDown, Loader2, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@solivio/ui/components/popover.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

export type CustomerSelection = {
  id: string | null;
  name: string;
};

type CustomerOption = {
  id: string;
  name: string;
  source: string;
};

type Props = {
  id?: string;
  value: CustomerSelection;
  onChange: (value: CustomerSelection) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function CustomerCombobox({ id, value, onChange, placeholder, disabled, className }: Props) {
  const t = useTranslations("CustomerCombobox");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value.name);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) setSearch(value.name);
  }, [open, value.name]);

  useEffect(() => {
    if (!open || disabled) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ query: search, limit: "8" });
        const response = await fetch(`/api/customers?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { customers?: CustomerOption[] };
        setCustomers(data.customers ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [disabled, open, search]);

  const normalizedSearch = normalizeName(search);
  const exactMatch = useMemo(
    () =>
      customers.some(
        (customer) => normalizeName(customer.name).toLowerCase() === normalizedSearch.toLowerCase(),
      ),
    [customers, normalizedSearch],
  );
  const canCreate = normalizedSearch.length > 0 && !exactMatch;

  function handleSearchChange(next: string) {
    setSearch(next);
    onChange({ id: null, name: next });
  }

  function selectCustomer(customer: CustomerOption) {
    onChange({ id: customer.id, name: customer.name });
    setSearch(customer.name);
    setOpen(false);
  }

  function selectNewCustomer() {
    onChange({ id: null, name: normalizedSearch });
    setSearch(normalizedSearch);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between bg-background/60 px-3 font-normal",
            !value.name && "text-muted-foreground",
            className,
          )}
        >
          <span className="min-w-0 truncate">{value.name || placeholder}</span>
          <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={placeholder}
            className="h-8 pl-8"
            autoFocus
          />
        </div>

        <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <Loader2 size={14} aria-hidden="true" className="animate-spin" />
              {t("loading")}
            </div>
          ) : null}

          {!isLoading && customers.length === 0 && !canCreate ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">{t("empty")}</p>
          ) : null}

          {customers.map((customer) => (
            <Button
              key={customer.id}
              type="button"
              variant="ghost"
              className="h-auto justify-start gap-2 px-2 py-2 font-normal"
              onClick={() => selectCustomer(customer)}
            >
              <Check
                size={14}
                aria-hidden="true"
                className={cn("shrink-0", value.id === customer.id ? "opacity-100" : "opacity-0")}
              />
              <span className="min-w-0 truncate text-left">{customer.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {customer.source}
              </span>
            </Button>
          ))}

          {canCreate ? (
            <Button
              type="button"
              variant="ghost"
              className="h-auto justify-start gap-2 px-2 py-2 font-normal text-primary"
              onClick={selectNewCustomer}
            >
              <Plus size={14} aria-hidden="true" />
              <span className="min-w-0 truncate text-left">
                {t("create", { name: normalizedSearch })}
              </span>
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
