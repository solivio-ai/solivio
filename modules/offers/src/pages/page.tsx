import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Slot } from "@solivio/slots";
import { AppPage } from "@solivio/ui/components/app-page.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { Card, CardContent, CardTitle } from "@solivio/ui/components/card.tsx";

import { IntegrationsSection } from "../components/dashboard/IntegrationsSection.tsx";
import { OffersList } from "../components/offers-list/components/OffersList.tsx";
import { QuickOfferSearch } from "../components/product-search/index.ts";
import { getRecentOffers } from "../server/offerService.ts";

export default async function Home() {
  const t = await getTranslations("offers.dashboard");
  const recentOffers = await getRecentOffers(4);

  return (
    <AppPage className="gap-7">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-primary/25 bg-card/80 shadow-sm" size="sm">
          <CardContent className="grid h-full gap-3 py-1 lg:flex lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <FileText size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base">{t("newOffer.title")}</CardTitle>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {t("newOffer.description")}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="h-9 w-full shrink-0 lg:w-auto">
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
      <Slot id="dashboard.cards" />
    </AppPage>
  );
}
