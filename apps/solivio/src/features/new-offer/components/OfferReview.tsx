"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferBuilder } from "./OfferBuilder";

type OfferReviewProps = {
  offerId: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; offer: Offer }
  | { kind: "error"; message: string };

export function OfferReview({ offerId }: OfferReviewProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let ignore = false;

    async function loadOffer() {
      setState({ kind: "loading" });

      try {
        const response = await fetch(`/api/offers/${offerId}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
        }

        if (!ignore) {
          setState({ kind: "ready", offer: payload.offer as Offer });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not load this offer."
          });
        }
      }
    }

    void loadOffer();

    return () => {
      ignore = true;
    };
  }, [offerId]);

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          Loading generated offer...
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" className="text-destructive" />
            <CardTitle>Offer not available</CardTitle>
          </div>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/offers/new">
              <ArrowLeft size={16} aria-hidden="true" />
              Create another draft
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <OfferBuilder offer={state.offer} />;
}
