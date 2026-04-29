"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  ListFilter,
  PackageCheck,
  Plus,
  Search,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type OfferStatus = "draft" | "accepted";
type StatusFilter = "all" | OfferStatus | "needs-attention";
type T = ReturnType<typeof useTranslations<"OffersList">>;

type OfferRow = {
  id: string;
  name?: string | null;
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
  totalPrice?: number;
};

type NormalizedOfferRow = {
  id: string;
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  unmatchedCount: number;
  notesCount: number;
  totalPrice: number | null;
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

function normalizeOffer(offer: OfferRow, t: T): NormalizedOfferRow {
  const createdAt = toIsoString(offer.createdAt);

  return {
    id: offer.id,
    name: offer.name?.trim() || offer.customerName?.trim() || t("fallbacks.unnamedOffer"),
    customerName: offer.customerName,
    clientRequest: offer.clientRequest ?? null,
    status: offer.status,
    createdAt,
    updatedAt: toIsoString(offer.updatedAt) || createdAt,
    productCount: offer.productCount ?? 0,
    unmatchedCount: offer.unmatchedCount ?? offer.unmatched?.length ?? 0,
    notesCount: offer.notesCount ?? offer.notes?.length ?? 0,
    totalPrice: typeof offer.totalPrice === "number" ? offer.totalPrice : null,
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

function getStatusLabel(status: string, t: T) {
  return isKnownStatus(status) ? t(`status.${status}.label`) : status;
}

function getStatusDescription(status: string, t: T) {
  return isKnownStatus(status)
    ? t(`status.${status}.description`)
    : t("fallbacks.customStatus");
}

function getFilterLabel(filter: StatusFilter, t: T) {
  if (filter === "needs-attention") return t("filters.needsAttention");
  if (filter === "all") return t("filters.all");
  return t(`filters.${filter}`);
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatRelative(value: string, locale: string, justNow: string) {
  const date = new Date(value).getTime();
  const diffMs = Date.now() - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "narrow",
  });

  if (diffMinutes < 1) return justNow;
  if (diffMinutes < 60) return formatter.format(-diffMinutes, "minute");

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return formatter.format(-diffHours, "hour");

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return formatter.format(-diffDays, "day");

  return formatDate(value, locale);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
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

function OfferActions({
  offer,
  fullWidth = false,
}: {
  offer: NormalizedOfferRow;
  fullWidth?: boolean;
}) {
  const t = useTranslations("OffersList");

  return (
    <div
      className={cn(
        "flex items-center justify-end",
        fullWidth && "w-full sm:w-auto"
      )}
    >
      <Button asChild size="sm" className={cn("w-full sm:w-auto", fullWidth && "flex-1 sm:flex-none")}>
        <Link href={`/offers/${offer.id}`}>
          {t("actions.reviewOffer")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function AttentionBadge({ offer }: { offer: NormalizedOfferRow }) {
  const t = useTranslations("OffersList");

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
  const t = useTranslations("OffersList");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const normalizedOffers = useMemo(
    () => offers.map((offer) => normalizeOffer(offer, t)),
    [offers, t]
  );

  const metrics = useMemo(() => {
    const total = normalizedOffers.length;
    const drafts = normalizedOffers.filter((offer) => offer.status === "draft").length;
    const accepted = normalizedOffers.filter((offer) => offer.status === "accepted").length;
    const needsAttention = normalizedOffers.filter((offer) => offer.unmatchedCount > 0).length;
    const matchedProducts = normalizedOffers.reduce((sum, offer) => sum + offer.productCount, 0);

    return { total, drafts, accepted, needsAttention, matchedProducts };
  }, [normalizedOffers]);

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return normalizedOffers.filter((offer) => {
      const matchesStatus =
        statusFilter === "all" ||
        offer.status === statusFilter ||
        (statusFilter === "needs-attention" && offer.unmatchedCount > 0);

      if (!matchesStatus) return false;
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
  }, [normalizedOffers, query, statusFilter]);

  const visibleOffers = hideHeader ? normalizedOffers : filteredOffers;

  return (
    <div className="grid gap-4">
      {hideHeader ? (
        <h2 className="text-lg font-semibold tracking-tight">{t("recent.title")}</h2>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
              <Badge variant="outline">
                {t("badges.offerCount", { count: metrics.total })}
              </Badge>
              <Badge variant="secondary">{t("badges.salesWorkspace")}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
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
            <>
              <div className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="mr-1 font-medium">{t("queue")}</span>
                  <Badge variant="outline">
                    <CircleDashed size={12} aria-hidden="true" />
                    {t("badges.draftsToReview", { count: metrics.drafts })}
                  </Badge>
                  <Badge variant={metrics.needsAttention > 0 ? "destructive" : "secondary"}>
                    <TriangleAlert size={12} aria-hidden="true" />
                    {t("badges.needsAttention", { count: metrics.needsAttention })}
                  </Badge>
                  <Badge variant="outline">
                    <PackageCheck size={12} aria-hidden="true" />
                    {t("badges.matchedProducts", { count: metrics.matchedProducts })}
                  </Badge>
                  <Badge variant="outline">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    {t("badges.accepted", { count: metrics.accepted })}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-80">
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

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <ListFilter
                      size={16}
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    >
                      <SelectTrigger className="w-full sm:w-44" aria-label={t("filters.label")}>
                        <span className="truncate">{getFilterLabel(statusFilter, t)}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("filters.all")}</SelectItem>
                        <SelectItem value="draft">{t("filters.draft")}</SelectItem>
                        <SelectItem value="accepted">{t("filters.accepted")}</SelectItem>
                        <SelectItem value="needs-attention">
                          {t("filters.needsAttention")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
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
                  }}
                >
                  {t("actions.clearFilters")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[18%]">{t("table.offer")}</TableHead>
                      <TableHead className="w-[26%]">
                        {t("table.customerRequest")}
                      </TableHead>
                      <TableHead className="w-[11%]">{t("table.status")}</TableHead>
                      <TableHead className="w-[13%]">{t("table.coverage")}</TableHead>
                      <TableHead className="w-[10%] text-right">
                        {t("table.value")}
                      </TableHead>
                      <TableHead className="w-[14%]">{t("table.activity")}</TableHead>
                      <TableHead className="w-[160px] text-right">
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
                                className="truncate font-medium hover:text-primary hover:underline"
                              >
                                {offer.name}
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
                              <StatusBadge status={offer.status} label={statusLabel} />
                              <span className="text-xs text-muted-foreground">
                                {statusDescription}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <div className="grid min-w-0 gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline">
                                  <PackageCheck size={12} aria-hidden="true" />
                                  {t("productCount", { count: offer.productCount })}
                                </Badge>
                                <AttentionBadge offer={offer} />
                              </div>
                              {offer.notesCount > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  {t("notes.generation", { count: offer.notesCount })}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {offer.totalPrice === null
                              ? t("fallbacks.noValue")
                              : formatNumber(offer.totalPrice, locale)}
                          </TableCell>
                          <TableCell className="whitespace-normal text-sm">
                            <div className="grid gap-1">
                              <span>
                                {t("activity.updated", {
                                  relativeTime: formatRelative(
                                    offer.updatedAt,
                                    locale,
                                    t("relative.justNow")
                                  ),
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("activity.created", {
                                  date: formatDate(offer.createdAt, locale),
                                })}
                              </span>
                            </div>
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

                  return (
                    <Card key={offer.id} size="sm">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="truncate">{offer.name}</CardTitle>
                            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <UserRound size={14} aria-hidden="true" />
                              <span className="truncate">
                                {getCustomerLabel(offer, t)}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={offer.status} label={statusLabel} />
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
                            <Badge variant="outline">{formatNumber(offer.totalPrice, locale)}</Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                          <span>
                            {t("activity.updated", {
                              relativeTime: formatRelative(
                                offer.updatedAt,
                                locale,
                                t("relative.justNow")
                              ),
                            })}
                          </span>
                          <span>{formatDate(offer.createdAt, locale)}</span>
                        </div>

                        <OfferActions offer={offer} fullWidth />
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
