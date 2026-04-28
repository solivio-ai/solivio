import Link from "next/link";
import { Plus } from "lucide-react";

import { RequestWorkbench } from "../features/request-workbench";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1440px] p-6 max-sm:p-4">
      <div className="mb-6">
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
      </div>

      <RequestWorkbench />
    </main>
  );
}
