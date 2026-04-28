import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NewOfferForm } from "../../../features/new-offer";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New offer" };

export default function NewOfferPage() {
  return (
    <main className="mx-auto grid max-w-[960px] gap-5 p-6 max-sm:p-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid gap-3">
          <BrandLockup href="/" tagline="Quotes shouldn’t take hours. They should start from your data." />
          <div className="flex flex-wrap gap-2">
            <Badge>Structured draft</Badge>
            <Badge variant="secondary">Review & adjust</Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
        </Button>
      </header>
      <NewOfferForm />
    </main>
  );
}
