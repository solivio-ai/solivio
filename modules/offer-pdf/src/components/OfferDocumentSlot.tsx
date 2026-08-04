"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { Offer } from "@solivio/domain";

const PdfViewer = dynamic(() => import("./PdfViewer.tsx").then((m) => ({ default: m.PdfViewer })), {
  ssr: false,
});

/** Contributed to `offer-detail.document`: the inline preview of the rendered PDF. */
export function OfferDocumentSlot({ offer }: { offer: Offer }) {
  const t = useTranslations("offer-pdf.document");
  return <PdfViewer url={`/api/offer-pdf/${offer.id}`} title={t("previewAria")} />;
}
