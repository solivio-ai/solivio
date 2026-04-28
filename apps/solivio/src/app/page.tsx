import Link from "next/link";
import { Plus } from "lucide-react";

import { ApiStatus, RequestWorkbench, UserMenu } from "../features/request-workbench";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto grid max-w-[1440px] gap-5 p-6 max-sm:p-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-3">
          <BrandLockup href="" tagline="Quotes shouldn’t take hours. They should start from your data." />
          <div className="flex flex-wrap gap-2">
            <Badge>Data-driven process</Badge>
            <Badge variant="secondary">Structured draft</Badge>
            <Badge variant="outline">Review & adjust</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ApiStatus />
        </div>
      </header>

      <div>
        <Card className="border-primary/30 bg-card">
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
      </div>

      <RequestWorkbench />
    </main>
  );
}
