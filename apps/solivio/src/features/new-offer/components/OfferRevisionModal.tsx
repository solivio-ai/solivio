"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, X } from "lucide-react";

import type { OfferRevision } from "@solivio/domain";
import { Button } from "@/components/ui/button";
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
   const tModal = useTranslations("NewOffer.revision.modal");
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
      const response = await fetch(
        `/api/offers/${offerId}/revisions/${revision.id}/restore`,
        { method: "POST" }
      );
      if (response.ok) {
        onClose();
        onRestored();
      }
    } finally {
      setRestoring(false);
    }
  }

  if (!open) return null;

  const snapshot = fullRevision?.snapshot;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={tModal("previewAria", { number: revision?.revisionNumber ?? "" })}
    >
      <div className="relative mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">
                {tModal("title", { number: revision?.revisionNumber })}
                {revision?.name && (
                  <span className="ml-2 font-normal text-muted-foreground italic">
                    — {revision.name}
                  </span>
                )}
              </h2>
              {revision?.acceptedAt && (
                <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                  {tModal("accepted")}
                </span>
              )}
            </div>
            {revision?.createdBy && (
              <p className="text-xs text-muted-foreground">
                {tModal("savedBy", { name: revision.createdBy.name })} ·{" "}
                {new Date(revision.createdAt).toLocaleString("pl-PL")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tModal("close")}>
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading || !snapshot ? (
            <div className="flex h-full items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {tModal("loading")}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Metadata */}
              <section className="grid gap-1 text-sm">
                <div className="flex gap-2">
                  <span className="w-32 text-muted-foreground">{tModal("name")}</span>
                  <span className="font-medium">{snapshot.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-32 text-muted-foreground">{tModal("customer")}</span>
                  <span>{snapshot.customerName ?? "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-32 text-muted-foreground">{tModal("status")}</span>
                  <span className="capitalize">{snapshot.status}</span>
                </div>
                {snapshot.notes.length > 0 && (
                  <div className="flex gap-2">
                    <span className="w-32 text-muted-foreground shrink-0">{tModal("notes")}</span>
                    <ul className="list-disc pl-4">
                      {snapshot.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Line items table */}
              <section>
                <h3 className="mb-2 text-sm font-medium">
                  {tModal("lineItems", { count: snapshot.lineItems.length })}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-1 font-normal">{tModal("product")}</th>
                      <th className="pb-1 font-normal text-right">{tModal("qty")}</th>
                      <th className="pb-1 font-normal text-right">{tModal("unitPrice")}</th>
                      <th className="pb-1 font-normal text-right">{tModal("total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.lineItems.map((item) => (
                      <tr key={item.productId} className="border-b last:border-0">
                        <td className="py-1.5">
                          <span className="font-medium">{item.name}</span>
                          {item.sku && (
                            <span className="ml-2 text-xs text-muted-foreground">{item.sku}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right">{item.quantity}</td>
                        <td className="py-1.5 text-right">
                          {formatCurrency(item.unitPriceNet, item.currency as "PLN" | "EUR")}
                        </td>
                        <td className="py-1.5 text-right">
                          {formatCurrency(item.quantity * item.unitPriceNet, item.currency as "PLN" | "EUR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={onClose} disabled={restoring}>
            {tModal("close")}
          </Button>
          <Button onClick={handleRestore} disabled={restoring || loading}>
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
        </div>
      </div>
    </div>
  );
}
