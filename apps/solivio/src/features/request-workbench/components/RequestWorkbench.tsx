"use client";

import { CheckCircle2, FileText, PackageSearch, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { demoOffer, demoProducts, demoRequest, workflowSteps } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  similarity: number;
};

type ProductSearchResponse = {
  prompt: string;
  answer: string;
  products: ProductSearchMatch[];
};

type ProductSearchError = {
  error?: { message?: string };
};

export function RequestWorkbench() {
  const [requestText, setRequestText] = useState(demoRequest.text);
  const [notice, setNotice] = useState("Prompt-based matching is ready.");
  const [searchSummary, setSearchSummary] = useState(
    "Run product matching to search embedded products from the database with VoltAgent."
  );
  const [matchedProducts, setMatchedProducts] = useState<ProductSearchMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRequest() {
    setIsSubmitting(true);
    setNotice("Creating draft request and searching products...");

    let requestNotice = "Draft request accepted by API.";

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: demoRequest.customerName, customerText: requestText })
      });
      if (!res.ok) requestNotice = "Request API rejected the draft, but matching can still continue.";
    } catch {
      requestNotice = "Request API is unavailable, but matching can still continue.";
    }

    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: requestText, limit: 5 })
      });

      const payload = (await res.json()) as ProductSearchResponse | ProductSearchError;

      if (!res.ok) {
        const err = payload as ProductSearchError;
        throw new Error(err.error?.message ?? `HTTP ${res.status}`);
      }

      const result = payload as ProductSearchResponse;
      setMatchedProducts(result.products);
      setSearchSummary(result.answer);
      setNotice(
        `${requestNotice} Found ${result.products.length} semantic product match${result.products.length === 1 ? "" : "es"}.`
      );
    } catch (error) {
      setMatchedProducts([]);
      setSearchSummary("Prompt-based product search is currently unavailable.");
      setNotice(error instanceof Error ? error.message : "Product matching failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(320px,1.2fr)_minmax(320px,1.1fr)]">
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

      {/* Customer request */}
      <Card className="min-h-[330px]" aria-label="Customer request">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <FileText size={18} aria-hidden="true" />
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            rows={8}
            aria-label="Customer request text"
            className="min-h-[180px]"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Button type="button" onClick={submitRequest} disabled={isSubmitting}>
              <Send size={16} aria-hidden="true" />
              {isSubmitting ? "Matching..." : "Analyze and match"}
            </Button>
            <p className="mb-0 text-sm leading-relaxed text-muted-foreground sm:text-right">{notice}</p>
          </div>
        </CardContent>
      </Card>

      {/* Product matches */}
      <Card className="lg:row-span-2" aria-label="Product matches">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <PackageSearch size={18} aria-hidden="true" />
          <CardTitle className="text-base">Product matches</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{searchSummary}</p>
          <div className="grid gap-2.5">
            {matchedProducts.length > 0 ? (
              matchedProducts.map((product) => (
                <article
                  key={product.id}
                  className="grid gap-2 rounded-lg border bg-card p-3.5"
                >
                  <div>
                    <h3 className="mb-1 text-sm font-semibold leading-tight">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{product.manufacturer}</Badge>
                    <span className="text-sm font-semibold">
                      {Math.round(product.similarity * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No semantic matches yet. Submit a request to query products.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Draft offer */}
      <Card className="min-h-[260px]" aria-label="Offer preview">
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
