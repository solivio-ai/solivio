"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  ListFilter,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
  MoreHorizontal,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  formName: string;
  formCustomerName: string;
  status: string;
  createdAt: string;
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

function isPersistedOfferId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function normalizeOffer(offer: OfferRow, t: T): NormalizedOfferRow {
  const createdAt = toIsoString(offer.createdAt);
  const formName = offer.name?.trim() ?? "";
  const formCustomerName = offer.customerName?.trim() ?? "";

  return {
    id: offer.id,
    name: formName || offer.customerName?.trim() || t("fallbacks.unnamedOffer"),
    customerName: offer.customerName,
    clientRequest: offer.clientRequest ?? null,
    formName,
    formCustomerName,
    status: offer.status,
    createdAt,
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

function getStatusDescription(status: string, t: T) {
  return isKnownStatus(status) ? t(`status.${status}.description`) : t("fallbacks.customStatus");
}

function getStatusLabel(status: string, t: T) {
  return isKnownStatus(status) ? t(`status.${status}.label`) : status;
}

function getFilterLabel(filter: StatusFilter, t: T) {
  if (filter === "needs-attention") return t("filters.needsAttention");
  if (filter === "all") return t("filters.all");
  return t(`filters.${filter}`);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const router = useRouter();
  const t = useTranslations("OffersList");
  const persisted = isPersistedOfferId(offer.id);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(offer.formName);
  const [editCustomer, setEditCustomer] = useState(offer.formCustomerName);

  const onEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (open) {
      setEditName(offer.formName);
      setEditCustomer(offer.formCustomerName);
    }
  };

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

  async function handleSaveEdit() {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          customerName: editCustomer.trim() ? editCustomer.trim() : null,
        }),
      });
      if (!response.ok) return;
      onEditOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end",
        fullWidth && "w-full sm:w-auto"
      )}
    >
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
                  onEditOpenChange(true);
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

      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actions.editDetailsTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`offer-edit-name-${offer.id}`}>{t("actions.fieldName")}</Label>
              <Input
                id={`offer-edit-name-${offer.id}`}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`offer-edit-customer-${offer.id}`}>
                {t("actions.fieldCustomerName")}
              </Label>
              <Input
                id={`offer-edit-customer-${offer.id}`}
                value={editCustomer}
                onChange={(event) => setEditCustomer(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onEditOpenChange(false)}>
              {t("actions.deleteCancel")}
            </Button>
            <Button
              type="button"
              disabled={saving || !editName.trim()}
              onClick={() => void handleSaveEdit()}
            >
              {t("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {t("actions.deleteOfferConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                        {/* <span className="truncate">{getFilterLabel(statusFilter, t)}</span> */}
                        <SelectValue />
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
              <div className="hidden overflow-x-auto rounded-lg border bg-card lg:block">
                <Table className="w-full min-w-[720px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%] min-w-0">{t("table.offer")}</TableHead>
                      <TableHead className="w-[28%] min-w-0">
                        {t("table.customerRequest")}
                      </TableHead>
                      <TableHead className="w-[12%] min-w-0">{t("table.status")}</TableHead>
                      <TableHead className="w-[16%] min-w-0">{t("table.coverage")}</TableHead>
                      <TableHead className="w-[10%] min-w-0 text-right">
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex w-fit shrink-0 cursor-default">
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
                            <Badge variant="outline">{formatNumber(offer.totalPrice, locale)}</Badge>
                          ) : null}
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
