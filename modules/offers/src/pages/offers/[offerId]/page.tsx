import { getTranslations } from "next-intl/server";

import { getChannelProvider } from "@solivio/sdk/runtime";
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
  /**
   * Which module backs the `offer` channel, resolved once here (server-side,
   * where the full runtime is available) rather than in the client-rendered
   * `OfferReview` tree. `OfferAcceptedView` uses it to show only that module's
   * document/action slot contributions — see
   * `docs/adr/0005-channels-output-capability.md`.
   *
   * `null` means the deployment bound no channel, and the accepted view simply
   * shows no document and no primary action.
   */
  const offerChannelModuleId = (await getChannelProvider("offer"))?.moduleId ?? null;

  return (
    <AppPage fullHeight>
      <OfferReview offerId={offerId} offerChannelModuleId={offerChannelModuleId} />
    </AppPage>
  );
}
