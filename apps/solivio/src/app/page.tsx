import Link from "next/link";
import { Plus } from "lucide-react";

import { ApiStatus, RequestWorkbench } from "../features/request-workbench";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserMenu } from "@/features/request-workbench/components/UserMenu";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1440px] p-6 max-sm:p-4">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl lg:text-[58px]">Solivio</h1>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ApiStatus />
        </div>
      </header>

      <div className="mb-6">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Start a new offer</CardTitle>
            <CardDescription>
              Enter a customer request to generate a draft offer.
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
