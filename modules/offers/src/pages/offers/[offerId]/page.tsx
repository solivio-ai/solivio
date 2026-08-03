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

/**
 * Which module backs the `offer` channel, resolved once here (server-side,
 * where the full runtime is available) rather than in the client-rendered
 * `OfferReview` tree. `OfferAcceptedView` uses it to show only that module's
 * document/action slot contributions — see `docs/adr/0005-channels-output-capability.md`.
 *
 * `null` means the deployment has no channel bound unambiguously (none
 * enabled, or several with no explicit `"offer.channel"` slot). That is a
 * configuration problem, not a per-request error, so it is swallowed here
 * rather than failing the page — the accepted view shows no document and no
 * primary action, which is honest about the misconfiguration without being
 * broken.
 */
async function resolveOfferChannelModuleId(): Promise<string | null> {
  try {
    return (await getChannelProvider("offer")).moduleId;
  } catch {
    return null;
  }
}

export default async function OfferReviewPage({ params }: OfferReviewPageProps) {
  const { offerId } = await params;
  const offerChannelModuleId = await resolveOfferChannelModuleId();

  return (
    <AppPage fullHeight>
      <OfferReview offerId={offerId} offerChannelModuleId={offerChannelModuleId} />
    </AppPage>
  );
}
