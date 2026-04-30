import { getTranslations } from "next-intl/server";

import { OfferReview } from "../../../features/new-offer";
import { AppPage } from "@/components/AppPage";

export async function generateMetadata() {
  const t = await getTranslations("NewOffer.review");
  return { title: t("pageTitle") };
}

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
