"use client";

import { CheckCircle2, FileText, PackageSearch, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { demoOffer, demoProducts, demoRequest, workflowSteps, type Product } from "@solivio/domain";

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
    <div className="workbench">
      <section className="timeline-panel" aria-label="Workflow">
        {workflowSteps.map((step, index) => (
          <article className={`timeline-step ${step.status}`} key={step.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="request-panel" aria-label="Customer request">
        <div className="panel-heading">
          <FileText size={18} aria-hidden="true" />
          <h2>Request</h2>
        </div>
        <textarea
          value={requestText}
          onChange={(event) => setRequestText(event.target.value)}
          rows={8}
          aria-label="Customer request text"
        />
        <div className="actions-row">
          <button type="button" onClick={submitRequest}>
            <Send size={16} aria-hidden="true" />
            Send to API
          </button>
          <p>{notice}</p>
        </div>
      </section>

      <section className="products-panel" aria-label="Product matches">
        <div className="panel-heading">
          <PackageSearch size={18} aria-hidden="true" />
          <h2>Product matches</h2>
        </div>
        <div className="product-list">
          {matchedProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div>
                <h3>{product.name}</h3>
                <p>{product.summary}</p>
              </div>
              <div className="product-meta">
                <span>{product.category}</span>
                <strong>{formatMoney(product.priceNet, product.currency)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="offer-panel" aria-label="Offer preview">
        <div className="panel-heading">
          <Sparkles size={18} aria-hidden="true" />
          <h2>Draft offer</h2>
        </div>
        <div className="offer-summary">
          <strong>{demoOffer.id}</strong>
          <span>{demoOffer.status}</span>
        </div>
        <ul className="offer-items">
          {demoOffer.items.map((item) => {
            const product = demoProducts.find((candidate) => candidate.id === item.productId);

            return (
              <li key={item.productId}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>
                  {item.quantity} x {product?.name ?? item.productId}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
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
