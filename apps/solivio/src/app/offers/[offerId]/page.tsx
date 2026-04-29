import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OfferReview } from "../../../features/new-offer";
import { BrandLockup } from "@/components/brand/BrandLockup";
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
    <main className="grid min-h-svh w-full gap-4 p-3 sm:p-4 lg:p-5 xl:p-6">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <BrandLockup href="/" tagline="Quotes shouldn’t take hours. They should start from your data." />
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/offers/new">
            <ArrowLeft size={16} aria-hidden="true" />
            New offer
          </Link>
        </Button>
      </header>
      <OfferReview offerId={offerId} />
    </main>
  );
}
