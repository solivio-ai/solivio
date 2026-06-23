import { AlertTriangle, BookOpen, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Offer, OfferKbArticle } from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";
import { Alert, AlertDescription } from "@solivio/ui/components/alert.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@solivio/ui/components/card.tsx";

import { CommercialTotals } from "./CommercialTotals";
import type { DraftLine } from "./offer-builder-types";

type OfferSummaryProps = {
  currency: DraftLine["currency"];
  discount: number;
  discountPercent: number;
  notes: Offer["notes"];
  kbArticles?: OfferKbArticle[];
  requestText: string;
  setDiscountPercent: (discountPercent: number) => void;
  status: Offer["status"];
  subtotal: number;
  total: number;
};

export function OfferSummary({
  currency,
  discount,
  discountPercent,
  notes,
  kbArticles = [],
  requestText,
  setDiscountPercent,
  status,
  subtotal,
  total,
}: OfferSummaryProps) {
  const tSummary = useTranslations("offers.newOffer.review.summary");
  return (
    <Card className="min-w-0 border border-foreground/15 shadow-sm ring-0" size="sm">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2">
          <FileText size={16} aria-hidden="true" className="text-primary" />
          {tSummary("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-4">
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">{tSummary("customerRequest")}</h2>
            <div className="max-h-[14.5rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-foreground/15 bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground">
              {requestText}
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">{tSummary("notes")}</h2>
              <div className="grid gap-2">
                {notes.map((note) => (
                  <Alert key={note}>
                    <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-primary" />
                    <AlertDescription className="text-sm leading-relaxed">{note}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </section>
          ) : null}

          {kbArticles.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <BookOpen size={14} className="text-muted-foreground" aria-hidden="true" />
                {tSummary("kbArticles")}
              </h2>
              <div className="grid gap-2">
                {kbArticles.map((ref) => (
                  <div
                    key={ref.articleId}
                    className="flex items-start gap-3 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-medium text-foreground leading-snug">
                          {ref.articleTitle}
                        </span>
                        <Badge variant="outline" className="text-xs py-0 shrink-0">
                          {ref.spaceName}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{ref.relevance}</p>
                    </div>
                    <Link
                      href={`/knowledge-base/${ref.spaceId}?article=${ref.articleId}`}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      title="Open article"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <CommercialTotals
          currency={currency}
          discount={discount}
          discountPercent={discountPercent}
          setDiscountPercent={setDiscountPercent}
          subtotal={subtotal}
          total={total}
          isLocked={status === OFFER_STATUS.ACCEPTED}
        />
      </CardContent>
    </Card>
  );
}
