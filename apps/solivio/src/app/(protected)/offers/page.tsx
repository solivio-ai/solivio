import { AppPage } from "@solivio/ui/components/app-page.tsx";
import { OffersList } from "@/features/offers-list/components/OffersList";
import { getOffers } from "@/server/offers/offerService";

export default async function OffersPage() {
  const rows = await getOffers();

  return (
    <AppPage>
      <OffersList offers={rows} />
    </AppPage>
  );
}
