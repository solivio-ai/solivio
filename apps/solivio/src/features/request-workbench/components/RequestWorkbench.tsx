import { CheckCircle2, PackageSearch, Sparkles } from "lucide-react";

import { demoOffer, demoProducts, workflowSteps } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const workflowStatusStyles = {
  mocked: "border-primary/35 bg-primary/10",
  planned: "border-secondary/70 bg-secondary/35",
  ready: "border-chart-4/60 bg-chart-4/15"
};

export function RequestWorkbench() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.1fr)]">
      <Card className="lg:row-span-2" aria-label="Workflow">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Offer workflow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4">
          {workflowSteps.map((step, index) => (
            <article
              key={step.id}
              className={cn(
                "grid min-h-[118px] grid-cols-[36px_1fr] items-start gap-3 rounded-lg border p-3",
                workflowStatusStyles[step.status]
              )}
            >
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-background text-xs font-bold text-primary ring-1 ring-border">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base leading-tight font-semibold">{step.title}</h2>
                  <Badge variant={step.status === "planned" ? "secondary" : "outline"}>{step.status}</Badge>
                </div>
                <p className="mb-0 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card aria-label="Product matches">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <PackageSearch size={18} aria-hidden="true" className="text-primary" />
          <CardTitle className="text-base">Product matches</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Semantic product matching runs after offer generation.
          </p>
          <p className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
            Start a new offer to extract requirements and match embedded products.
          </p>
        </CardContent>
      </Card>

      <Card aria-label="Offer preview">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Sparkles size={18} aria-hidden="true" className="text-primary" />
          <CardTitle className="text-base">Draft offer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3.5 flex items-center justify-between">
            <strong className="text-sm">{demoOffer.id}</strong>
            <Badge variant="outline" className="uppercase">
              {demoOffer.status}
            </Badge>
          </div>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {demoOffer.items.map((item) => {
              const product = demoProducts.find((candidate) => candidate.id === item.productId);
              return (
                <li
                  key={item.productId}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-muted/30 p-2.5"
                >
                  <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 text-primary" />
                  <span className="text-sm">
                    {item.quantity} x {product?.name ?? item.productId}
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
