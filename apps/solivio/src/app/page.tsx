import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OffersList } from "@/features/offers-list/components/OffersList";
import { getRecentOffers } from "@/server/offers/offerService";
import { QuickOfferSearch } from "@/features/product-search";

export default async function Home() {
  const recentOffers = await getRecentOffers(10);

  return (
    <main className="mx-auto max-w-[1440px] p-6 max-sm:p-4 w-full">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Start a new offer</CardTitle>
            <CardDescription>
              Generate structured offer drafts based on your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/offers/new">
                <Plus size={16} aria-hidden="true" />
                New offer
              </Link>
            </Button>
          </CardContent>
        </Card>

        <QuickOfferSearch />
      </div>

      <div className="mt-8">
        <OffersList offers={recentOffers} hideHeader />
      </div>
    </main>
  );
}
