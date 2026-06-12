import { getTranslations } from "next-intl/server";

import { AppPage } from "@solivio/ui/components/app-page.tsx";

import { OfferReview } from "../../../components/new-offer/index.ts";

export async function generateMetadata() {
  const t = await getTranslations("offers.newOffer.review");
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
