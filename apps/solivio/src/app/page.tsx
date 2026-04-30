import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OffersList } from "@/features/offers-list/components/OffersList";
import { getRecentOffers } from "@/server/offers/offerService";
import { QuickOfferSearch } from "@/features/product-search";
import { AppPage } from "@/components/AppPage";
import { IntegrationsSection } from "@/features/integrations/components/IntegrationsSection";

export default async function Home() {
  const t = await getTranslations("Dashboard");
  const recentOffers = await getRecentOffers(10);

  return (
    <AppPage className="gap-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed" size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("newOffer.title")}</CardTitle>
            <CardDescription>
              {t("newOffer.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/offers/new">
                <Plus size={16} aria-hidden="true" />
                {t("newOffer.button")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <QuickOfferSearch />
      </div>

      <div>
        <OffersList offers={recentOffers} hideHeader />
      </div>

      <IntegrationsSection />
    </AppPage>
  );
}
