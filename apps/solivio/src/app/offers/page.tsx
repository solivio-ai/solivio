import { OffersList } from "@/features/offers-list/components/OffersList";
import { getOffers } from "@/server/offers/offerService";
import { AppPage } from "@/components/AppPage";

export default async function OffersPage() {
  const rows = await getOffers();

  return (
    <AppPage>
      <OffersList offers={rows} />
    </AppPage>
  );
}
