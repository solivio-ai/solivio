import type { SlotContributions } from "@solivio/sdk";

import { DownloadPdfButton } from "./components/DownloadPdfButton.tsx";
import { OfferDocumentSlot } from "./components/OfferDocumentSlot.tsx";

export const slots: SlotContributions = {
  "offer-detail.document": [
    {
      id: "offer-pdf.document",
      component: OfferDocumentSlot,
    },
  ],
  "offer-detail.primaryAction": [
    {
      id: "offer-pdf.download-button",
      component: DownloadPdfButton,
    },
  ],
};
