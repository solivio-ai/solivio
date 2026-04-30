import { getTranslations } from "next-intl/server";

import { AppPage } from "@/components/AppPage";

import { DemoOfferClient } from "./DemoOfferClient";

export async function generateMetadata() {
  const t = await getTranslations("DemoOffer");
  return { title: t("pageTitle") };
}

export default function DemoOfferPage() {
  return (
    <AppPage>
      <DemoOfferClient />
    </AppPage>
  );
}
