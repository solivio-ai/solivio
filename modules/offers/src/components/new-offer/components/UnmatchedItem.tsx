import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import type { OfferUnmatchedItem } from "@solivio/domain";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@solivio/ui/components/accordion.tsx";
import { Button } from "@solivio/ui/components/button.tsx";

export function UnmatchedItem({
  entry,
  modifyEnabled,
  onDelete,
  onManuallyMatch,
}: {
  entry: OfferUnmatchedItem;
  modifyEnabled: boolean;
  onDelete: (id: string) => void;
  onManuallyMatch: (entry: OfferUnmatchedItem) => void;
}) {
  const t = useTranslations("offers.newOffer.review.products");

  return (
    <div className="w-full min-w-0 rounded-lg border border-foreground/15 bg-background/60 p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0 font-medium text-foreground">{entry.item}</span>
        {modifyEnabled ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(entry.id)}
              aria-label={t("removeUnmatchedAria", { item: entry.item })}
            >
              {t("removeUnmatched")}
            </Button>
            <Button
              size="sm"
              onClick={() => onManuallyMatch(entry)}
              aria-label={t("manuallyMatchProduct")}
            >
              {t("manuallyMatchProduct")}
            </Button>
          </div>
        ) : null}
      </div>

      {entry.reason ? (
        <Accordion type="single" collapsible className="mt-1">
          <AccordionItem value="details" className="border-none">
            <div className="w-fit">
              <AccordionTrigger className="py-1.5 text-xs gap-2 text-muted-foreground hover:no-underline">
                {t("details")}
              </AccordionTrigger>
            </div>
            <AccordionContent className="grid gap-2 pb-0">
              <div className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0 text-primary/70" aria-hidden="true" />
                <p>{entry.reason}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
