"use client";

import { Bug, MessageSquare, Search } from "lucide-react";

import type { OfferDebugFragment } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type OfferDebugPanelProps = {
  clientRequest: string;
  fragments: OfferDebugFragment[];
};

export function OfferDebugPanel({ clientRequest, fragments }: OfferDebugPanelProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit gap-2">
          <Bug size={14} aria-hidden="true" />
          Inspect product matching
          <Badge variant="secondary" className="ml-1">
            {fragments.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[95vw] !max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:!max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Product matching breakdown</DialogTitle>
          <DialogDescription>
            Customer request, extracted fragments, and top 3 catalog matches per fragment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5">
          <section className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare size={14} aria-hidden="true" />
              <span>Customer request</span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {clientRequest || <span className="text-muted-foreground">(empty)</span>}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Search size={14} aria-hidden="true" />
              <span>Extracted fragments &amp; top matches</span>
              <Badge variant="secondary" className="ml-1">
                {fragments.length}
              </Badge>
            </div>

            {fragments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No debug data captured for this offer.
              </p>
            ) : (
              <ul className="grid gap-3">
                {fragments.map((f, idx) => (
                  <li key={idx} className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Fragment
                        </div>
                        <div className="break-words text-sm font-medium">
                          {f.requestFragment}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant={f.kind === "sku" ? "default" : "secondary"}>
                          {f.kind}
                        </Badge>
                        <Badge variant="outline">qty {f.quantity}</Badge>
                      </div>
                    </div>

                    <div className="mb-3 grid gap-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Search query
                      </div>
                      <code className="block break-words rounded bg-muted px-2 py-1 text-xs">
                        {f.query}
                      </code>
                    </div>

                    <div className="grid gap-1.5">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Top matches
                      </div>
                      {f.topMatches.length === 0 ? (
                        <div className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                          No matches above similarity threshold.
                        </div>
                      ) : (
                        <ol className="grid gap-1">
                          {f.topMatches.map((m, mIdx) => (
                            <li
                              key={m.id}
                              className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-xs"
                            >
                              <span className="w-4 shrink-0 text-muted-foreground">
                                {mIdx + 1}.
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{m.name}</div>
                                <div className="truncate text-muted-foreground">
                                  SKU: {m.sku}
                                </div>
                              </div>
                              <Badge variant="outline" className="shrink-0 font-mono">
                                {m.similarity.toFixed(4)}
                              </Badge>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
