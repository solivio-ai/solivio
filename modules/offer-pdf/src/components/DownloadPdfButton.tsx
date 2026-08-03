"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@solivio/ui/components/button.tsx";

function downloadPdf(offerId: string) {
  window.open(`/api/offers/${offerId}/pdf?download=1`, "_blank", "noopener,noreferrer");
}

/** Contributed to `offer-detail.primaryAction`: what running this channel looks like. */
export function DownloadPdfButton({ offerId }: { offerId: string }) {
  const t = useTranslations("offer-pdf.action");
  return (
    <Button onClick={() => downloadPdf(offerId)}>
      <Download size={16} aria-hidden="true" />
      {t("download")}
    </Button>
  );
}
