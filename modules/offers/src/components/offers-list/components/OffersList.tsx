"use client";

import {
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  ListFilter,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@solivio/ui/components/alert-dialog.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@solivio/ui/components/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@solivio/ui/components/empty.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@solivio/ui/components/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@solivio/ui/components/table.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@solivio/ui/components/tooltip.tsx";

import { calculateNetTotal } from "../../../lib/offerTotals.ts";
import { EditOfferDetailsDialog } from "./EditOfferDetailsDialog";

type OfferStatus = "draft" | "accepted";
type StatusFilter = "all" | OfferStatus | "needs-attention";
type SortKey = "createdAtDesc" | "createdAtAsc" | "valueDesc" | "valueAsc" | "customerAsc";
type T = ReturnType<typeof useTranslations<"OffersList">>;

const UNASSIGNED_CUSTOMER_FILTER = "__unassigned";

type OfferRow = {
  id: string;
  name?: string | null;
  customerId?: string | null;
  customerName: string | null;
  clientRequest?: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  productCount?: number;
  unmatchedCount?: number;
  notesCount?: number;
  unmatched?: string[];
  notes?: string[];
  totalNet?: number;
  discountPercent?: number;
  currency: string;
};

type NormalizedOfferRow = {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  clientRequest: string | null;
  formName: string;
  formCustomerName: string;
  status: string;
  createdAt: string;
  productCount: number;
  unmatchedCount: number;
  notesCount: number;
  totalPrice: number | null;
  currency: string;
};

type Props = {
  offers: OfferRow[];
  hideHeader?: boolean;
};

const statusConfig: Record<
  OfferStatus,
  {
    icon: typeof CircleDashed;
    badge: "default" | "secondary" | "outline";
  }
> = {
  draft: {
    icon: CircleDashed,
    badge: "outline",
  },
  accepted: {
    icon: CheckCircle2,
    badge: "default",
  },
};

function isKnownStatus(status: string): status is OfferStatus {
  return status === "draft" || status === "accepted";
}

function toIsoString(value: string | Date | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

function isPersistedOfferId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function normalizeOffer(offer: OfferRow, t: T): NormalizedOfferRow {
  const createdAt = toIsoString(offer.createdAt);
  const formName = offer.name?.trim() ?? "";
  const formCustomerName = offer.customerName?.trim() ?? "";

  return {
    id: offer.id,
    name: formName || offer.customerName?.trim() || t("fallbacks.unnamedOffer"),
    customerId: offer.customerId ?? null,
    customerName: offer.customerName,
    clientRequest: offer.clientRequest ?? null,
    formName,
    formCustomerName,
    status: offer.status,
    createdAt,
    productCount: offer.productCount ?? 0,
    unmatchedCount: offer.unmatchedCount ?? offer.unmatched?.length ?? 0,
    notesCount: offer.notesCount ?? offer.notes?.length ?? 0,
    totalPrice:
      typeof offer.totalNet === "number"
        ? calculateNetTotal(offer.totalNet, offer.discountPercent ?? 0)
        : null,
    currency: offer.currency,
  };
}

function getStatusConfig(status: string) {
  return isKnownStatus(status)
    ? statusConfig[status]
    : {
        icon: CircleDashed,
        badge: "outline" as const,
      };
}

function getStatusDescription(status: string, t: T) {
  return isKnownStatus(status) ? t(`status.${status}.description`) : t("fallbacks.customStatus");
}

function getStatusLabel(status: string, t: T) {
  return isKnownStatus(status) ? t(`status.${status}.label`) : status;
}

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCreatedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getCustomerLabel(offer: NormalizedOfferRow, t: T) {
  return offer.customerName?.trim() || t("fallbacks.customer");
}

function getRequestPreview(offer: NormalizedOfferRow, t: T) {
  return offer.clientRequest?.trim() || t("fallbacks.request");
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.badge} className="capitalize">
      <Icon size={12} aria-hidden="true" />
      {label}
    </Badge>
  );
}

function OfferActions({ offer }: { offer: NormalizedOfferRow }) {
  const router = useRouter();
  const t = useTranslations("offers.offersList");
  const persisted = isPersistedOfferId(offer.id);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/offers/${offer.id}`, { method: "DELETE" });
      if (!response.ok) return;
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("actions.openActions", { name: offer.name })}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("actions.offerActions")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{t("table.actions")}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/offers/${offer.id}`}>
              <ArrowUpRight size={14} aria-hidden="true" />
              {t("actions.reviewOffer")}
            </Link>
          </DropdownMenuItem>
          {persisted ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setEditOpen(true);
                }}
              >
                <Pencil size={14} aria-hidden="true" />
                {t("actions.editDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                {t("actions.deleteOffer")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditOfferDetailsDialog
        offerId={offer.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialName={offer.formName}
        initialCustomer={{ id: offer.customerId, name: offer.formCustomerName }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.deleteOfferConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.deleteOfferConfirmDescription", { name: offer.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("actions.deleteCancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {t("actions.deleteOfferConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AttentionBadge({ offer }: { offer: NormalizedOfferRow }) {
  const t = useTranslations("offers.offersList");

  if (offer.unmatchedCount === 0) {
    return (
      <Badge variant="secondary">
        <PackageCheck size={12} aria-hidden="true" />
        {t("attention.allMatched")}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <TriangleAlert size={12} aria-hidden="true" />
      {t("attention.gapCount", { count: offer.unmatchedCount })}
    </Badge>
  );
}

export function OffersList({ offers, hideHeader }: Props) {
  const locale = useLocale();
  const t = useTranslations("offers.offersList");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAtDesc");

  const normalizedOffers = useMemo(
    () => offers.map((offer) => normalizeOffer(offer, t)),
    [offers, t],
  );

  const customerFilterOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const offer of normalizedOffers) {
      if (offer.customerId && offer.customerName?.trim()) {
        byId.set(offer.customerId, offer.customerName.trim());
      }
    }
    return [...byId.entries()].sort(([, left], [, right]) =>
      left.localeCompare(right, locale, { sensitivity: "base" }),
    );
  }, [locale, normalizedOffers]);

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedOffers.filter((offer) => {
      const matchesStatus =
        statusFilter === "all" ||
        offer.status === statusFilter ||
        (statusFilter === "needs-attention" && offer.unmatchedCount > 0);

      const matchesCustomer =
        customerFilter === "all" ||
        (customerFilter === UNASSIGNED_CUSTOMER_FILTER && !offer.customerId) ||
        offer.customerId === customerFilter;

      if (!matchesStatus) return false;
      if (!matchesCustomer) return false;
      if (!normalizedQuery) return true;

      return [
        offer.name,
        offer.customerName,
        offer.clientRequest,
        offer.status,
        String(offer.productCount),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "createdAtAsc":
          return a.createdAt.localeCompare(b.createdAt);
        case "valueDesc":
          return (b.totalPrice ?? -Infinity) - (a.totalPrice ?? -Infinity);
        case "valueAsc":
          return (a.totalPrice ?? Infinity) - (b.totalPrice ?? Infinity);
        case "customerAsc":
          return (a.customerName ?? "").localeCompare(b.customerName ?? "", locale, {
            sensitivity: "base",
          });
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return sorted;
  }, [normalizedOffers, query, statusFilter, customerFilter, sortKey, locale]);

  const visibleOffers = hideHeader ? normalizedOffers : filteredOffers;

  return (
    <div className="grid gap-4">
      {hideHeader ? (
        <h2 className="text-lg font-semibold tracking-tight">{t("recent.title")}</h2>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto sm:self-start lg:self-auto">
            <Link href="/offers/new">
              <Plus size={16} aria-hidden="true" />
              {t("actions.newOffer")}
            </Link>
          </Button>
        </div>
      )}

      {normalizedOffers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/offers/new">
                <Plus size={16} aria-hidden="true" />
                {t("actions.newOffer")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {!hideHeader ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm sm:flex-1">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search.placeholder")}
                  className="pl-8"
                  aria-label={t("search.label")}
                />
              </div>

              <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                <ListFilter size={16} aria-hidden="true" className="text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    <SelectItem value="draft">{t("filters.draft")}</SelectItem>
                    <SelectItem value="accepted">{t("filters.accepted")}</SelectItem>
                    <SelectItem value="needs-attention">{t("filters.needsAttention")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <UserRound size={16} aria-hidden="true" className="text-muted-foreground" />
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="w-full sm:w-56" aria-label={t("filters.customerLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allCustomers")}</SelectItem>
                    <SelectItem value={UNASSIGNED_CUSTOMER_FILTER}>
                      {t("filters.unassignedCustomer")}
                    </SelectItem>
                    {customerFilterOptions.map(([customerId, customerName]) => (
                      <SelectItem key={customerId} value={customerId}>
                        {customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <ArrowUpDown size={16} aria-hidden="true" className="text-muted-foreground" />
                <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                  <SelectTrigger className="w-full sm:w-52" aria-label={t("sort.label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAtDesc">{t("sort.createdAtDesc")}</SelectItem>
                    <SelectItem value="createdAtAsc">{t("sort.createdAtAsc")}</SelectItem>
                    <SelectItem value="valueDesc">{t("sort.valueDesc")}</SelectItem>
                    <SelectItem value="valueAsc">{t("sort.valueAsc")}</SelectItem>
                    <SelectItem value="customerAsc">{t("sort.customerAsc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {visibleOffers.length === 0 ? (
            <Empty className="rounded-lg border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>{t("matchingEmpty.title")}</EmptyTitle>
                <EmptyDescription>{t("matchingEmpty.description")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                    setCustomerFilter("all");
                  }}
                >
                  {t("actions.clearFilters")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border bg-card lg:block">
                <Table className="w-full min-w-[720px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[22%] min-w-0">{t("table.offer")}</TableHead>
                      <TableHead className="w-[34%] min-w-0">
                        {t("table.customerRequest")}
                      </TableHead>
                      <TableHead className="w-[12%] min-w-0">{t("table.status")}</TableHead>
                      <TableHead className="w-[12%] min-w-0">{t("table.createdAt")}</TableHead>
                      <TableHead className="w-[12%] min-w-0 text-right">
                        {t("table.value")}
                      </TableHead>
                      <TableHead className="w-14 min-w-14 text-right">
                        {t("table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOffers.map((offer) => {
                      const statusLabel = getStatusLabel(offer.status, t);
                      const statusDescription = getStatusDescription(offer.status, t);
                      return (
                        <TableRow key={offer.id} className="align-top">
                          <TableCell className="whitespace-normal">
                            <div className="grid min-w-0 gap-1">
                              <Link
                                href={`/offers/${offer.id}`}
                                className="inline-flex min-w-0 items-center gap-1 truncate font-medium hover:text-primary hover:underline"
                              >
                                {offer.name}
                                <ArrowUpRight size={13} aria-hidden="true" className="shrink-0" />
                              </Link>
                              <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                                <UserRound size={14} aria-hidden="true" />
                                <span className="min-w-0 truncate">
                                  {getCustomerLabel(offer, t)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <p className="line-clamp-2 min-w-0 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                              {getRequestPreview(offer, t)}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <div className="grid gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex w-fit max-w-full cursor-default">
                                    <StatusBadge status={offer.status} label={statusLabel} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{statusDescription}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatCreatedAt(offer.createdAt, locale)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {offer.totalPrice === null
                              ? t("fallbacks.noValue")
                              : formatCurrency(offer.totalPrice, offer.currency, locale)}
                          </TableCell>
                          <TableCell className="text-right">
                            <OfferActions offer={offer} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                {visibleOffers.map((offer) => {
                  const statusLabel = getStatusLabel(offer.status, t);
                  const statusDescription = getStatusDescription(offer.status, t);

                  return (
                    <Card
                      key={offer.id}
                      size="sm"
                      className="transition-colors hover:ring-primary/40"
                    >
                      <CardHeader>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <CardTitle className="min-w-0">
                              <Link
                                href={`/offers/${offer.id}`}
                                className="inline-flex max-w-full items-center gap-1 truncate hover:text-primary hover:underline"
                              >
                                <span className="truncate">{offer.name}</span>
                                <ArrowUpRight size={13} aria-hidden="true" className="shrink-0" />
                              </Link>
                            </CardTitle>
                            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <UserRound size={14} aria-hidden="true" />
                              <span className="truncate">{getCustomerLabel(offer, t)}</span>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex w-fit max-w-full shrink-0 cursor-default justify-self-end">
                                <StatusBadge status={offer.status} label={statusLabel} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{statusDescription}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <p className="line-clamp-3 min-w-0 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                          {getRequestPreview(offer, t)}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">
                            <PackageCheck size={12} aria-hidden="true" />
                            {t("productCount", { count: offer.productCount })}
                          </Badge>
                          <AttentionBadge offer={offer} />
                          {offer.notesCount > 0 ? (
                            <Badge variant="outline">
                              {t("notes.short", { count: offer.notesCount })}
                            </Badge>
                          ) : null}
                          {offer.totalPrice !== null ? (
                            <Badge variant="outline">
                              {formatCurrency(offer.totalPrice, offer.currency, locale)}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/offers/${offer.id}`}>
                              <ArrowUpRight size={14} aria-hidden="true" />
                              {t("actions.reviewOffer")}
                            </Link>
                          </Button>
                          <OfferActions offer={offer} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
