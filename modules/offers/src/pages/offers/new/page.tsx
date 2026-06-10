import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppPage } from "@solivio/ui/components/app-page.tsx";
import { Button } from "@solivio/ui/components/button.tsx";

import { NewOfferForm } from "../../../components/new-offer/index.ts";

export async function generateMetadata() {
  const t = await getTranslations("offers.newOffer.page");
  return { title: t("title") };
}

export default async function NewOfferPage() {
  const t = await getTranslations("offers.newOffer.page");

  return (
    <AppPage>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </header>
      <NewOfferForm />
    </AppPage>
  );
}
