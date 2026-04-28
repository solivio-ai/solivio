"use client";

import { CheckCircle2, FileText, PackageSearch, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { demoOffer, demoProducts, demoRequest, workflowSteps, type Product } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function RequestWorkbench() {
  const [requestText, setRequestText] = useState(demoRequest.text);
  const [notice, setNotice] = useState("Mock offer ready for review.");

  const matchedProducts = useMemo(
    () => rankProducts(requestText, demoProducts),
    [requestText]
  );

  async function submitRequest() {
    setNotice("Creating draft request...");

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: demoRequest.customerName,
          customerText: requestText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setNotice("Draft request accepted by API.");
    } catch {
      setNotice("Working from local mock data until the API is reachable.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.2fr)_minmax(320px,1.1fr)]">
      <Card className="lg:row-span-2" aria-label="Workflow">
        <CardContent className="grid gap-3 p-4">
          {workflowSteps.map((step, index) => (
            <article
              className={`grid min-h-[110px] grid-cols-[36px_1fr] items-start gap-3 rounded-lg border p-3 ${
                step.status === "mocked"
                  ? "bg-blue-950/40"
                  : step.status === "planned"
                    ? "bg-amber-950/40"
                    : "bg-emerald-950/40"
              }`}
              key={step.id}
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

      <Card className="min-h-[330px]" aria-label="Customer request">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <FileText size={18} aria-hidden="true" />
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            rows={8}
            aria-label="Customer request text"
            className="min-h-[180px]"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Button type="button" onClick={submitRequest}>
              <Send size={16} aria-hidden="true" />
              Send to API
            </Button>
            <p className="mb-0 text-sm leading-relaxed text-muted-foreground sm:text-right">{notice}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:row-span-2" aria-label="Product matches">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <PackageSearch size={18} aria-hidden="true" />
          <CardTitle className="text-base">Product matches</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {matchedProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="grid min-h-[128px] gap-3 p-3.5">
                <div>
                  <h3 className="mb-1 text-base leading-tight font-semibold">{product.name}</h3>
                  <p className="mb-0 text-sm leading-relaxed text-muted-foreground">{product.summary}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{product.category}</Badge>
                  <strong className="text-sm">{formatMoney(product.priceNet, product.currency)}</strong>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-[260px]" aria-label="Offer preview">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Sparkles size={18} aria-hidden="true" />
          <CardTitle className="text-base">Draft offer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3.5 flex items-center justify-between">
            <strong>{demoOffer.id}</strong>
            <Badge variant="outline" className="uppercase">
              {demoOffer.status}
            </Badge>
          </div>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {demoOffer.items.map((item) => {
              const product = demoProducts.find((candidate) => candidate.id === item.productId);

              return (
                <li key={item.productId} className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-muted/30 p-2.5">
                  <CheckCircle2 size={16} aria-hidden="true" className="text-primary" />
                  <span>
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

function rankProducts(requestText: string, products: Product[]) {
  const tokens = requestText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return [...products].sort((left, right) => scoreProduct(right, tokens) - scoreProduct(left, tokens));
}

function scoreProduct(product: Product, tokens: string[]) {
  return product.tags.reduce((score, tag) => score + (tokens.includes(tag) ? 1 : 0), 0);
}

function formatMoney(amount: number, currency: Product["currency"]) {
  return new Intl.NumberFormat("pl-PL", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}
