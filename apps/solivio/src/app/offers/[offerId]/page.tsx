import Link from "next/link";
import { Plus } from "lucide-react";

import { OfferReview } from "../../../features/new-offer";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offer review" };

type OfferReviewPageProps = {
  params: Promise<{
    offerId: string;
  }>;
};

export default async function OfferReviewPage({ params }: OfferReviewPageProps) {
  const { offerId } = await params;

  return (
    <main className="grid min-h-svh w-full gap-3 p-3 lg:p-4">
      <header className="flex min-w-0 justify-end">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/offers/new">
            <Plus size={16} aria-hidden="true" />
            New offer
          </Link>
        </Button>
      </header>
      <OfferReview offerId={offerId} />
    </main>
  );
}
