import { listOffers } from "@/server/offers/offerRepository";
import { OffersList } from "@/features/offers-list/components/OffersList";

export default async function OffersPage() {
  const rows = await listOffers();

  return (
    <main className="max-w-[1440px] p-6 max-sm:p-4">
      <OffersList offers={rows} />
    </main>
  );
}
