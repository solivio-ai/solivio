import { AppPage } from "@solivio/ui/components/app-page.tsx";

import { OffersList } from "../../components/offers-list/components/OffersList.tsx";
import { getOffers } from "../../server/offerService.ts";

export default async function OffersPage() {
  const rows = await getOffers();

  return (
    <AppPage>
      <OffersList offers={rows} />
    </AppPage>
  );
}
