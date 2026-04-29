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
    <main className="grid min-h-svh w-full gap-3 p-3 lg:p-4">
      <OfferReview offerId={offerId} />
    </main>
  );
}
