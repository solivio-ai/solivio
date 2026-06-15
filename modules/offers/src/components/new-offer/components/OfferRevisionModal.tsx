"use client";

import { AlertTriangle, Loader2, RotateCcw, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { OfferRevision } from "@solivio/domain";
import { Alert, AlertDescription } from "@solivio/ui/components/alert.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@solivio/ui/components/dialog.tsx";
import { Skeleton } from "@solivio/ui/components/skeleton.tsx";

import { calculateNetTotal, calculateSubtotalNet } from "../../../lib/offerTotals.ts";
import { formatCurrency } from "./offer-builder-types";

type OfferRevisionModalProps = {
  revision: OfferRevision | null;
  offerId: string;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
};

export function OfferRevisionModal({
  revision,
  offerId,
  open,
  onClose,
  onRestored,
}: OfferRevisionModalProps) {
  const tModal = useTranslations("offers.newOffer.revision.modal");
  const [fullRevision, setFullRevision] = useState<OfferRevision | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || !revision) {
      setFullRevision(null);
      return;
    }
    setLoading(true);
    fetch(`/api/offers/${offerId}/revisions/${revision.id}`)
      .then((r) => r.json())
      .then((data) => setFullRevision(data.revision as OfferRevision))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, revision, offerId]);

  async function handleRestore() {
    if (!revision) return;
    setRestoring(true);
    try {
      const response = await fetch(`/api/offers/${offerId}/revisions/${revision.id}/restore`, {
        method: "POST",
      });
      if (response.ok) {
        onClose();
        onRestored();
      }
    } finally {
      setRestoring(false);
    }
  }

  const snapshot = fullRevision?.snapshot;

  const subtotal = snapshot ? calculateSubtotalNet(snapshot.items) : 0;
  const discount = snapshot ? subtotal * (snapshot.discountPercent / 100) : 0;
  const total = snapshot ? calculateNetTotal(subtotal, snapshot.discountPercent) : 0;
  const isSnapshotReady = !loading && Boolean(snapshot);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <DialogHeader className="gap-1 border-b px-5 py-4">
          <div className="flex items-center gap-2 pr-6">
            <DialogTitle>{tModal("title", { number: revision?.revisionNumber ?? "" })}</DialogTitle>
            {revision?.snapshot?.name && (
              <span className="text-sm font-normal text-muted-foreground italic">
                — {revision.snapshot.name}
              </span>
            )}
            {revision?.acceptedAt && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                {tModal("accepted")}
              </Badge>
            )}
          </div>
          {revision?.createdBy && (
            <DialogDescription className="flex items-center gap-1">
              <User size={11} aria-hidden="true" />
              {tModal("savedBy", { name: revision.createdBy.name })}
              {" · "}
              {new Date(revision.createdAt).toLocaleString("pl-PL")}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <LoadingSkeleton />
          ) : snapshot ? (
            <div className="flex flex-col gap-4">
              {/* Metadata */}
              <section className="grid gap-2 rounded-lg border border-foreground/15 bg-background/60 p-3 text-sm">
                <MetaRow label={tModal("name")} value={snapshot.name} />
                <MetaRow label={tModal("customer")} value={snapshot.customerName ?? "—"} />
                <MetaRow
                  label={tModal("status")}
                  value={
                    <Badge variant="outline" className="capitalize">
                      {snapshot.status}
                    </Badge>
                  }
                />
                {snapshot.clientRequest && (
                  <div className="grid gap-1 pt-1 border-t border-foreground/10">
                    <span className="text-xs text-muted-foreground">{tModal("clientRequest")}</span>
                    <div className="leading-relaxed text-muted-foreground line-clamp-10 whitespace-pre-wrap overflow-auto">
                      {snapshot.clientRequest}
                    </div>
                  </div>
                )}
                {snapshot.notes.length > 0 && (
                  <div className="grid gap-1.5 pt-1 border-t border-foreground/10">
                    <span className="text-xs text-muted-foreground">{tModal("notes")}</span>
                    {snapshot.notes.map((note, i) => (
                      <Alert key={i} className="text-xs py-2 px-2.5">
                        <AlertTriangle
                          size={13}
                          className="shrink-0 text-amber-500"
                          aria-hidden="true"
                        />
                        <AlertDescription className="text-xs text-foreground">
                          {note}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
                {snapshot.unmatched.length > 0 && (
                  <div className="grid gap-1.5 pt-1 border-t border-foreground/10">
                    <span className="text-xs text-muted-foreground">{tModal("unmatched")}</span>
                    {snapshot.unmatched.map((entry, i) => (
                      <Alert key={i} variant="warning" className="text-xs py-2 px-2.5">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                        <AlertDescription className="grid gap-0.5">
                          <span>{entry.item}</span>
                          {entry.reason ? (
                            <span className="text-muted-foreground">{entry.reason}</span>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </section>

              {/* Line items */}
              <section className="grid gap-2">
                <h3 className="text-sm font-medium">
                  {tModal("lineItems", { count: snapshot.items.length })}
                </h3>
                <div className="rounded-lg border border-foreground/15 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left font-normal">{tModal("product")}</th>
                        <th className="px-3 py-2 text-right font-normal">{tModal("qty")}</th>
                        <th className="px-3 py-2 text-right font-normal">{tModal("unitPrice")}</th>
                        <th className="px-3 py-2 text-right font-normal">{tModal("total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {snapshot.items.map((item) => (
                        <tr key={item.productId} className="bg-background/60">
                          <td className="px-3 py-2.5">
                            <span className="font-medium">{item.name}</span>
                            {item.sku && (
                              <span className="ml-2 text-xs text-muted-foreground">{item.sku}</span>
                            )}
                            {item.rationale && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.rationale}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatCurrency(item.unitPriceNet, snapshot.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                            {formatCurrency(item.quantity * item.unitPriceNet, snapshot.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-foreground/15 bg-muted/40 text-sm">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">
                          {tModal("subtotal")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatCurrency(subtotal, snapshot.currency)}
                        </td>
                      </tr>
                      {snapshot.discountPercent > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-1 text-right text-muted-foreground">
                            {tModal("discount")} ({snapshot.discountPercent}%)
                          </td>
                          <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">
                            -{formatCurrency(discount, snapshot.currency)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-foreground/15">
                        <td colSpan={3} className="px-3 py-2 text-right font-medium">
                          {tModal("totalNet")}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-base font-semibold">
                          {formatCurrency(total, snapshot.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
              {tModal("previewUnavailable")}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 p-4">
          <Button variant="outline" onClick={onClose} disabled={restoring}>
            {tModal("close")}
          </Button>
          <Button onClick={handleRestore} disabled={restoring || !isSnapshotReady}>
            {restoring ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {tModal("restoring")}
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                {tModal("restoreAction")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 rounded-lg border border-foreground/15 p-3">
        {[80, 120, 60].map((w) => (
          <Skeleton key={w} className="h-4 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24 rounded" />
        <div className="rounded-lg border border-foreground/15 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-foreground/10 px-3 py-2.5 last:border-0"
            >
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
