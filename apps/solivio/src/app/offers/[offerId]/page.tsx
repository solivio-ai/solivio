import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OfferReview } from "../../../features/new-offer";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { Badge } from "@/components/ui/badge";
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
    <main className="mx-auto grid max-w-[1440px] gap-5 p-6 max-sm:p-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid gap-3">
          <BrandLockup href="/" tagline="Quotes shouldn’t take hours. They should start from your data." />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{offerId}</Badge>
            <Badge>Review draft</Badge>
            <Badge variant="secondary">Save by offer id</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
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
