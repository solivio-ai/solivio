import { CheckCircle2, PackageSearch, Sparkles } from "lucide-react";

import { demoOffer, demoProducts, workflowSteps } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RequestWorkbench() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.1fr)]">
      {/* Workflow timeline */}
      <Card className="lg:row-span-2" aria-label="Workflow">
        <CardContent className="grid gap-3 p-4">
          {workflowSteps.map((step, index) => (
            <article
              key={step.id}
              className={`grid min-h-[110px] grid-cols-[36px_1fr] items-start gap-3 rounded-lg border p-3 ${
                step.status === "mocked"
                  ? "bg-blue-950/40"
                  : step.status === "planned"
                    ? "bg-amber-950/40"
                    : "bg-emerald-950/40"
              }`}
            >
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="mb-1 text-base leading-tight font-semibold">{step.title}</h2>
                <p className="mb-0 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      {/* Product matches */}
      <Card aria-label="Product matches">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <PackageSearch size={18} aria-hidden="true" />
          <CardTitle className="text-base">Product matches</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Semantic product matching runs after offer generation.
          </p>
        </CardContent>
      </Card>

      {/* Draft offer */}
      <Card aria-label="Offer preview">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Sparkles size={18} aria-hidden="true" />
          <CardTitle className="text-base">Draft offer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3.5 flex items-center justify-between">
            <strong className="text-sm">{demoOffer.id}</strong>
            <Badge variant="outline" className="uppercase">{demoOffer.status}</Badge>
          </div>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {demoOffer.items.map((item) => {
              const product = demoProducts.find((p) => p.id === item.productId);
              return (
                <li
                  key={item.productId}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-muted/30 p-2.5"
                >
                  <CheckCircle2 size={16} aria-hidden="true" className="text-primary shrink-0" />
                  <span className="text-sm">
                    {item.quantity} × {product?.name ?? item.productId}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
