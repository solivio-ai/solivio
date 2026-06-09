"use client";

import { FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerSelection } from "@/features/customers";
import { CustomerCombobox } from "@/features/customers";

import { OfferGenerationProgress } from "./OfferGenerationProgress";

type GenerationState = "idle" | "running" | "complete";
type NoticeKey = "initial" | "preparing" | "generated" | "error";

export function NewOfferForm() {
  const router = useRouter();
  const t = useTranslations("NewOffer.form");
  const generationT = useTranslations("NewOffer.generation");
  const [customer, setCustomer] = useState<CustomerSelection>({ id: null, name: "" });
  const [clientRequest, setClientRequest] = useState("");
  const [noticeKey, setNoticeKey] = useState<NoticeKey>("initial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);

  useEffect(() => {
    if (generationState !== "running" || generationStartedAt === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setGenerationElapsedMs(Date.now() - generationStartedAt);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [generationStartedAt, generationState]);

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    const startedAt = Date.now();

    setIsSubmitting(true);
    setGenerationState("running");
    setGenerationStartedAt(startedAt);
    setGenerationElapsedMs(0);
    setNoticeKey("preparing");

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          clientRequest,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as { offer: Offer };
      setGenerationState("complete");
      setGenerationElapsedMs(Date.now() - startedAt);
      setNoticeKey("generated");
      router.push(`/offers/${json.offer.id}`);
    } catch {
      setNoticeKey("error");
      setGenerationState("idle");
      setGenerationStartedAt(null);
      setGenerationElapsedMs(0);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="border-primary/30" size="sm">
        <CardHeader className="pb-1">
          <div className="flex items-center gap-2">
            <FileText size={18} aria-hidden="true" className="text-primary" />
            <CardTitle>{t("title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="customer-name">{t("customerName.label")}</Label>
              <CustomerCombobox
                id="customer-name"
                value={customer}
                onChange={setCustomer}
                placeholder={t("customerName.placeholder")}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client-request">{t("clientRequest.label")}</Label>
              <Textarea
                id="client-request"
                value={clientRequest}
                onChange={(e) => setClientRequest(e.target.value)}
                rows={6}
                className="min-h-36 bg-background/60"
                placeholder={t("clientRequest.placeholder")}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" size="sm" disabled={isSubmitting || !clientRequest.trim()}>
                <Sparkles size={16} aria-hidden="true" />
                {isSubmitting ? t("actions.preparing") : t("actions.generate")}
              </Button>
              <p className="text-sm text-muted-foreground">{t(`notices.${noticeKey}`)}</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={generationState !== "idle"}>
        <DialogContent
          className="max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto border-primary/20 bg-background/95 shadow-2xl sm:max-w-3xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{generationT("dialogTitle")}</DialogTitle>
            <DialogDescription>{generationT("dialogDescription")}</DialogDescription>
          </DialogHeader>
          {generationState !== "idle" ? (
            <OfferGenerationProgress elapsedMs={generationElapsedMs} state={generationState} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
