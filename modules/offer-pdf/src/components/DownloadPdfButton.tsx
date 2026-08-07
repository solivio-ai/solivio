"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Offer } from "@solivio/domain";
import { Button } from "@solivio/ui/components/button.tsx";

function downloadPdf(offerId: string) {
  window.open(`/api/offer-pdf/${offerId}?download=1`, "_blank", "noopener,noreferrer");
}

/** Contributed to `offer-detail.actions`: what this channel offers the user. */
export function DownloadPdfButton({ offer }: { offer: Offer }) {
  const t = useTranslations("offer-pdf.action");
  return (
    <Button onClick={() => downloadPdf(offer.id)}>
      <Download size={16} aria-hidden="true" />
      {t("download")}
    </Button>
  );
}
