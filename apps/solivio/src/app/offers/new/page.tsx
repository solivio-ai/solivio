import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NewOfferForm } from "../../../features/new-offer";
import { AppPage } from "@/components/AppPage";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New offer" };

export default async function NewOfferPage() {
  const t = await getTranslations("NewOffer.page");

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
