import { DemoOfferClient } from "./DemoOfferClient";

export const metadata = { title: "Demo offer" };

export default function DemoOfferPage() {
  return (
    <main className="mx-auto max-w-[960px] p-4">
      <DemoOfferClient />
    </main>
  );
}
