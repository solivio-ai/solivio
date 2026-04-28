import { NewOfferForm } from "../../../features/new-offer";

export const metadata = { title: "New Offer — Solivio" };

export default function NewOfferPage() {
  return (
    <main className="mx-auto max-w-[860px] p-6 max-sm:p-4">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight">New Offer</h1>
        <p className="mt-1 text-muted-foreground">
          Describe the customer request to generate a draft offer.
        </p>
      </header>
      <NewOfferForm />
    </main>
  );
}
