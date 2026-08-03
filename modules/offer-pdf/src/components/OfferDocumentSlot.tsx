"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const PdfViewer = dynamic(() => import("./PdfViewer.tsx").then((m) => ({ default: m.PdfViewer })), {
  ssr: false,
});

/** Contributed to `offer-detail.document`: the inline preview of the rendered PDF. */
export function OfferDocumentSlot({ offerId }: { offerId: string }) {
  const t = useTranslations("offer-pdf.document");
  return <PdfViewer url={`/api/offers/${offerId}/pdf`} title={t("previewAria")} />;
}
