import { desc } from "drizzle-orm";

import { db } from "@/server/database/db";
import { offers } from "@/server/database/schema";
import { OffersList } from "@/features/offers-list/components/OffersList";

export default async function OffersPage() {
  const rows = await db
    .select()
    .from(offers)
    .orderBy(desc(offers.createdAt));

  return (
    <main className="max-w-[1440px] p-6 max-sm:p-4">
      <OffersList offers={rows} />
    </main>
  );
}
