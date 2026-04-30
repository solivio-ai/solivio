import { OfferReview } from "../../../features/new-offer";
import { AppPage } from "@/components/AppPage";

export const metadata = { title: "Offer review" };

type OfferReviewPageProps = {
  params: Promise<{
    offerId: string;
  }>;
};

export default async function OfferReviewPage({ params }: OfferReviewPageProps) {
  const { offerId } = await params;

  return (
    <AppPage fullHeight>
      <OfferReview offerId={offerId} />
    </AppPage>
  );
}
