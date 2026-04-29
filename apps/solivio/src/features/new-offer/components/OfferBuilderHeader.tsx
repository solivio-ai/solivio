import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, RotateCcw, Send } from "lucide-react";

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
  saveState: SaveState;
  status: Offer["status"];
};

export function OfferBuilderHeader({
  assistantToggle,
  customerName,
  generatedDate,
  lineCount,
  onAccept,
  onAddProduct,
  onRetrySave,
  saveState,
  status,
}: OfferBuilderHeaderProps) {
  const saveStatus =
    saveState === "saving"
      ? {
          Icon: Loader2,
          className: "text-muted-foreground",
          iconClassName: "animate-spin",
          label: "Saving changes..."
        }
      : saveState === "saved"
        ? {
            Icon: CheckCircle2,
            className: "text-muted-foreground",
            iconClassName: "text-primary",
            label: "All changes saved."
          }
        : saveState === "error"
          ? {
              Icon: AlertCircle,
              className: "text-destructive",
              iconClassName: "text-destructive",
              label: "Could not save changes."
            }
          : null;
  const SaveStatusIcon = saveStatus?.Icon;

  return (
    <header className="grid min-w-0 gap-2 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid min-w-0 gap-2">
        <h1 className="text-lg leading-tight font-semibold">Offer for {customerName}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={status === "accepted" ? "default" : "outline"}>
            {status}
          </Badge>
          <Badge variant="secondary">{lineCount} products</Badge>
          <Badge variant="outline">Generated {generatedDate}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        {assistantToggle}
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
