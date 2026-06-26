import type { OfferKbArticle } from "@solivio/domain";
import type { SlotContributions } from "@solivio/sdk";

import { OfferKbArticlesSlot } from "./components/OfferKbArticlesSlot.tsx";

declare module "@solivio/sdk" {
  interface SlotPropsMap {
    "offers.summary.kbArticles": { kbArticles: OfferKbArticle[] };
  }
}

export const slots: SlotContributions = {
  "offers.summary.kbArticles": [
    {
      id: "knowledge-base.offer-kb-articles",
      component: OfferKbArticlesSlot,
    },
  ],
};
