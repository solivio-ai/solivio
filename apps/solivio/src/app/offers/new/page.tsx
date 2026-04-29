import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NewOfferForm } from "../../../features/new-offer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New offer" };

export default async function NewOfferPage() {
  const t = await getTranslations("NewOffer.page");

  return (
    <main className="mx-auto grid max-w-[1180px] gap-4 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge>{t("badges.generatedDraft")}</Badge>
            <Badge variant="secondary">{t("badges.review")}</Badge>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </header>
      <NewOfferForm />
    </main>
  );
}
