"use client";

import Link from "next/link";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OfferBuilder } from "./OfferBuilder";
import { OfferChat } from "@/features/offer-chat/components/OfferChat";
import { cn } from "@/lib/utils";

type OfferReviewProps = {
  offerId: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; offer: Offer }
  | { kind: "error"; message: string };

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);

    updateMatch();
    media.addEventListener("change", updateMatch);

    return () => media.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

export function OfferReview({ offerId }: OfferReviewProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [assistantOpen, setAssistantOpen] = useState(true);
  const assistantPanelRef = useRef<PanelImperativeHandle>(null);
  const isWideLayout = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    const assistantPanel = assistantPanelRef.current;
    if (!assistantPanel) return;

    if (assistantOpen) {
      assistantPanel.expand();
      return;
    }

    assistantPanel.collapse();
  }, [assistantOpen, isWideLayout]);

  const fetchOffer = useCallback(async (): Promise<Offer> => {
    const response = await fetch(`/api/offers/${offerId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
    }
    return payload.offer as Offer;
  }, [offerId]);

  useEffect(() => {
    let ignore = false;

    setState({ kind: "loading" });

    fetchOffer()
      .then((offer: Offer) => { if (!ignore) setState({ kind: "ready", offer }); })
      .catch((error: unknown) => {
        if (!ignore) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not load this offer."
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchOffer]);

  const refreshOffer = useCallback(() => {
    fetchOffer()
      .then((offer: Offer) => {
        setState({ kind: "ready", offer });
      })
      .catch(() => {});
  }, [fetchOffer]);

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

  function handleAssistantResize(size: PanelSize) {
    if (size.asPercentage <= 1) {
      setAssistantOpen(false);
    }
  }

  function handleOfferChange(offer: Offer) {
    setState({ kind: "ready", offer });
  }

  function renderAssistantToggle(compact = false) {
    const label = assistantOpen ? "Hide assistant" : "Show assistant";
    const Icon = assistantOpen ? PanelRightClose : PanelRightOpen;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={assistantOpen ? "ghost" : "outline"}
            size={compact ? "icon-sm" : "default"}
            onClick={() => setAssistantOpen((current) => !current)}
            aria-controls="offer-assistant-panel"
            aria-pressed={assistantOpen}
            aria-label={label}
            className={cn("shrink-0", !compact && "w-full sm:w-auto")}
          >
            <Icon size={16} aria-hidden="true" />
            {!compact ? <span>{assistantOpen ? "Hide assistant" : "Assistant"}</span> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <section className="min-h-0">
      <div className="h-[calc(100svh-7rem)] min-h-[540px] xl:min-h-[600px]">
        {assistantOpen ? (
          <ResizablePanelGroup
            orientation={isWideLayout ? "horizontal" : "vertical"}
            className="min-h-0 rounded-lg"
          >
            <ResizablePanel
              id="offer-review"
              defaultSize={isWideLayout ? "66%" : "58%"}
              minSize={isWideLayout ? "54%" : "42%"}
              maxSize={isWideLayout ? "74%" : "70%"}
              className="min-h-0"
            >
              <div className="h-full min-h-0 overflow-y-auto pr-1">
                <OfferBuilder offer={state.offer} onOfferChange={handleOfferChange} />
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              aria-label="Resize offer review and assistant panes"
            />

            <ResizablePanel
              id="offer-assistant-panel"
              panelRef={assistantPanelRef}
              defaultSize={isWideLayout ? "34%" : "42%"}
              minSize={isWideLayout ? "26%" : "30%"}
              maxSize={isWideLayout ? "46%" : "58%"}
              collapsedSize="0%"
              collapsible
              onResize={handleAssistantResize}
              className="min-h-0"
            >
              <div className="h-full min-h-0 overflow-hidden pl-0 pt-3 xl:pl-3 xl:pt-0">
                <OfferChat
                  offer={state.offer}
                  className="h-full"
                  headerAction={renderAssistantToggle(true)}
                  onOfferChanged={refreshOffer}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full min-h-0 overflow-y-auto pr-1">
            <OfferBuilder
              offer={state.offer}
              onOfferChange={handleOfferChange}
              assistantToggle={renderAssistantToggle()}
            />
          </div>
        )}
      </div>
    </section>
  );
}
