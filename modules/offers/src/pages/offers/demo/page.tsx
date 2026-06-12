import { getTranslations } from "next-intl/server";

import { AppPage } from "@solivio/ui/components/app-page.tsx";

import { DemoOfferClient } from "./DemoOfferClient";

export async function generateMetadata() {
  const t = await getTranslations("offers.demoOffer");
  return { title: t("pageTitle") };
}

export default function DemoOfferPage() {
  return (
    <AppPage>
      <DemoOfferClient />
    </AppPage>
  );
}
