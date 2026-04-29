import type { ReactNode } from "react";
import { Plus, Save, Send } from "lucide-react";

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
  onSave: () => void;
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
  onSave,
  saveState,
  status,
}: OfferBuilderHeaderProps) {
  return (
    <header className="grid min-w-0 gap-3 rounded-lg border bg-card p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="grid min-w-0 gap-2">
        <h1 className="text-xl leading-tight font-semibold">Offer for {customerName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "accepted" ? "default" : "outline"}>
            {status}
          </Badge>
          <Badge variant="secondary">{lineCount} products</Badge>
          <Badge variant="outline">Generated {generatedDate}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        {assistantToggle}
        <Button className="w-full sm:w-auto" onClick={onAddProduct}>
          <Plus size={16} aria-hidden="true" />
          Add product
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" onClick={onSave}>
          <Save size={16} aria-hidden="true" />
          Save review
        </Button>
        <Button className="w-full sm:w-auto" onClick={onAccept}>
          <Send size={16} aria-hidden="true" />
          Accept draft
        </Button>
      </div>

      {saveState !== "idle" ? (
        <p className="text-xs text-muted-foreground lg:col-span-2">
          {saveState === "saving"
            ? "Saving review..."
            : saveState === "saved"
              ? "Review saved for this offer id."
              : "Could not save review edits."}
        </p>
      ) : null}
    </header>
  );
}
