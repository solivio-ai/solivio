"use client";

import { FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewOfferForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [clientRequest, setClientRequest] = useState("");
  const [notice, setNotice] = useState("Fill in the request and generate a draft offer.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice("Generating draft offer...");

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, clientRequest })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as { offer: Offer };
      setNotice("Draft offer generated.");
      router.push(`/offers/${json.offer.id}`);
    } catch {
      setNotice("Could not generate offer right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText size={18} aria-hidden="true" className="text-primary" />
            <CardTitle>Create offer</CardTitle>
          </div>
          <CardDescription>Provide the customer details and request text.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="customer-name">Customer name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ACME Sp. z o.o."
                className="bg-background/60"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client-request">Customer request</Label>
              <Textarea
                id="client-request"
                value={clientRequest}
                onChange={(e) => setClientRequest(e.target.value)}
                rows={8}
                className="min-h-[180px] bg-background/60"
                placeholder="Describe what the customer needs..."
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" disabled={isSubmitting}>
                <Sparkles size={16} aria-hidden="true" />
                {isSubmitting ? "Generating..." : "Generate draft offer"}
              </Button>
              <p className="text-sm text-muted-foreground">{notice}</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
