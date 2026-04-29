import type { ReactNode } from "react";
import { AlertCircle, BookmarkPlus, CheckCircle2, Loader2, Plus, RotateCcw, Send, User } from "lucide-react";

import type { Offer } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SaveState } from "./offer-builder-types";

type OfferBuilderHeaderProps = {
  assistantToggle?: ReactNode;
  customerName: string;
  generatedDate: string;
  lineCount: number;
  onAccept: () => void;
  onAddProduct: () => void;
  onRetrySave: () => void;
  onSaveRevision: () => void;
  saveRevisionState: "idle" | "saving" | "saved";
  saveState: SaveState;
  status: Offer["status"];
  createdBy?: { id: string; name: string } | null;
  createdAt?: string;
  updatedBy?: { id: string; name: string } | null;
  updatedAt?: string;
};

export function OfferBuilderHeader({
  assistantToggle,
  customerName,
  generatedDate,
  lineCount,
  onAccept,
  onAddProduct,
  onRetrySave,
  onSaveRevision,
  saveRevisionState,
  saveState,
  status,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: OfferBuilderHeaderProps) {
  const saveStatus =
    saveState === "saving"
      ? { Icon: Loader2, className: "text-muted-foreground", iconClassName: "animate-spin", label: "Saving changes..." }
      : saveState === "saved"
        ? { Icon: CheckCircle2, className: "text-muted-foreground", iconClassName: "text-primary", label: "All changes saved." }
        : saveState === "error"
          ? { Icon: AlertCircle, className: "text-destructive", iconClassName: "text-destructive", label: "Could not save changes." }
          : null;
  const SaveStatusIcon = saveStatus?.Icon;

  const revisionButtonLabel =
    saveRevisionState === "saving"
      ? "Saving..."
      : saveRevisionState === "saved"
        ? "Revision saved"
        : "Save revision";

  return (
    <header className="grid min-w-0 gap-2 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid min-w-0 gap-2">
        <h1 className="text-lg leading-tight font-semibold">Offer for {customerName}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={status === "accepted" ? "default" : "outline"}>{status}</Badge>
          <Badge variant="secondary">{lineCount} products</Badge>
          <Badge variant="outline">Generated {generatedDate}</Badge>
        </div>
        {(createdBy?.name || updatedBy?.name) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {createdBy?.name && (
              <span
                className="flex items-center gap-1"
                title={createdAt ? new Date(createdAt).toLocaleString("pl-PL") : undefined}
              >
                <User size={11} aria-hidden="true" />
                Created by {createdBy.name}
              </span>
            )}
            {updatedBy?.name && (
              <span
                className="flex items-center gap-1"
                title={updatedAt ? new Date(updatedAt).toLocaleString("pl-PL") : undefined}
              >
                <User size={11} aria-hidden="true" />
                Last modified by {updatedBy.name}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        {assistantToggle}
        <Button
          className="w-full sm:w-auto"
          size="sm"
          variant="outline"
          onClick={onSaveRevision}
          disabled={status === "accepted" || saveRevisionState === "saving"}
        >
          <BookmarkPlus size={16} aria-hidden="true" />
          {revisionButtonLabel}
        </Button>
        <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={onAddProduct}>
          <Plus size={16} aria-hidden="true" />
          Add product
        </Button>
        <Button className="w-full sm:w-auto" size="sm" onClick={onAccept}>
          <Send size={16} aria-hidden="true" />
          Accept draft
        </Button>
      </div>

      {saveStatus && SaveStatusIcon ? (
        <div className={`flex flex-wrap items-center gap-2 text-xs ${saveStatus.className} lg:col-span-2`}>
          <SaveStatusIcon size={14} aria-hidden="true" className={saveStatus.iconClassName} />
          <span>{saveStatus.label}</span>
          {saveState === "error" ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetrySave}>
              <RotateCcw size={14} aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
