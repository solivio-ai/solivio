import { OfferReview } from "../../../features/new-offer";

export const metadata = { title: "Offer review" };

type OfferReviewPageProps = {
  params: Promise<{
    offerId: string;
  }>;
};

export default async function OfferReviewPage({ params }: OfferReviewPageProps) {
  const { offerId } = await params;

  return (
    <main className="grid h-[calc(100svh-2.25rem)] min-h-0 w-full p-3 lg:p-4">
      <OfferReview offerId={offerId} />
    </main>
  );
}
