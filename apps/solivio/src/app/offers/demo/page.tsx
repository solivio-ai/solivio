import { getTranslations } from "next-intl/server";

import { DemoOfferClient } from "./DemoOfferClient";
import { AppPage } from "@/components/AppPage";

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
