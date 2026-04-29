import { OffersList } from "@/features/offers-list/components/OffersList";
import { getOffers } from "@/server/offers/offerService";

export default async function OffersPage() {
  const rows = await getOffers();

  return (
    <main className="max-w-[1440px] p-6 max-sm:p-4">
      <OffersList offers={rows} />
    </main>
  );
}
