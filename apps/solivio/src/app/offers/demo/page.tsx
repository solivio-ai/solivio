import { DemoOfferClient } from "./DemoOfferClient";
import { AppPage } from "@/components/AppPage";

export const metadata = { title: "Demo offer" };

export default function DemoOfferPage() {
  return (
    <AppPage>
      <DemoOfferClient />
    </AppPage>
  );
}
