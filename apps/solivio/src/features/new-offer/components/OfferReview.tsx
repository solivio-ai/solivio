"use client";

import { AlertTriangle, ArrowLeft, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels";

import type { Offer, OfferRevision } from "@solivio/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OfferChatHandle } from "@/features/offer-chat/components/OfferChat";
import { OfferChat } from "@/features/offer-chat/components/OfferChat";
import { cn } from "@/lib/utils";

import { OfferAcceptedView } from "./OfferAcceptedView";
import { OfferBuilder } from "./OfferBuilder";
import { OfferRevisionModal } from "./OfferRevisionModal";
import { OfferRevisionTimeline } from "./OfferRevisionTimeline";

type OfferReviewProps = {
  offerId: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; offer: Offer }
  | { kind: "error"; message: string };

const paneScrollClass =
  "h-full min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin]";

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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"chat" | "revisions">("chat");
  const [revisions, setRevisions] = useState<OfferRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<OfferRevision | null>(null);
  const assistantPanelRef = useRef<PanelImperativeHandle>(null);
  const chatRef = useRef<OfferChatHandle>(null);
  const pendingChatMessage = useRef<string | null>(null);
  const discountPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tReview = useTranslations("NewOffer.review");
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
      .then((offer: Offer) => {
        if (!ignore) setState({ kind: "ready", offer });
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : tReview("error"),
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchOffer]);

  const loadRevisions = useCallback(async () => {
    setRevisionsLoading(true);
    try {
      const response = await fetch(`/api/offers/${offerId}/revisions`);
      const data = (await response.json()) as { revisions: OfferRevision[] };
      setRevisions(data.revisions);
    } catch {
      // ignore
    } finally {
      setRevisionsLoading(false);
    }
  }, [offerId]);

  const offerUpdatedAt = state.kind === "ready" ? state.offer.updatedAt : null;

  useEffect(() => {
    if (rightPanel === "revisions") {
      void loadRevisions();
    }
  }, [rightPanel, loadRevisions, offerUpdatedAt]);

  const refreshOffer = useCallback(() => {
    fetchOffer()
      .then((offer: Offer) => {
        setState({ kind: "ready", offer });
      })
      .catch(() => {});
  }, [fetchOffer]);

  useEffect(
    () => () => {
      if (discountPersistTimer.current) clearTimeout(discountPersistTimer.current);
    },
    [],
  );

  const handleDiscountPercentChange = useCallback(
    (nextDiscountPercent: number) => {
      setState((current) => {
        if (current.kind !== "ready") return current;
        return {
          kind: "ready",
          offer: { ...current.offer, discountPercent: nextDiscountPercent },
        };
      });

      if (discountPersistTimer.current) clearTimeout(discountPersistTimer.current);
      discountPersistTimer.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/offers/${offerId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discountPercent: nextDiscountPercent }),
          });
          if (!response.ok) return;
          const payload = await response.json();
          // Merge server-side fields (updatedAt, updatedBy, ...) but keep the latest user input.
          setState((current) => {
            if (current.kind !== "ready") return current;
            return {
              kind: "ready",
              offer: { ...payload.offer, discountPercent: current.offer.discountPercent },
            };
          });
        } catch {
          // ignore — input remains optimistic; a later edit will retry the PATCH.
        }
      }, 500);
    },
    [offerId],
  );

  useEffect(() => {
    if (!assistantOpen || rightPanel !== "chat" || !pendingChatMessage.current) return;
    chatRef.current?.sendText(pendingChatMessage.current);
    pendingChatMessage.current = null;
  }, [assistantOpen, rightPanel]);

  function handleSendToChat(message: string) {
    if (assistantOpen && rightPanel === "chat" && chatRef.current) {
      chatRef.current.sendText(message);
      return;
    }
    pendingChatMessage.current = message;
    setAssistantOpen(true);
    setRightPanel("chat");
  }

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          {tReview("loading")}
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
            <CardTitle>{tReview("notFound")}</CardTitle>
          </div>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/offers/new">
              <ArrowLeft size={16} aria-hidden="true" />
              {tReview("createAnother")}
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

  async function handleBackToDraft() {
    const response = await fetch(`/api/offers/${offerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });

    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.offer) {
      setState({ kind: "ready", offer: payload.offer as Offer });
    }
  }

  function renderAssistantToggle() {
    const label = tReview("assistant.title");
    const Icon = assistantOpen ? PanelRightClose : PanelRightOpen;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={assistantOpen ? "ghost" : "outline"}
            size="icon-sm"
            onClick={() => setAssistantOpen((current) => !current)}
            aria-controls="offer-assistant-panel"
            aria-pressed={assistantOpen}
            aria-label={label}
            className="shrink-0"
          >
            <Icon size={16} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  function renderRightPanel() {
    if (state.kind !== "ready") return null;
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-foreground/15 bg-card shadow-sm">
        <div className="flex shrink-0 items-center gap-1 border-b border-foreground/15 px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={cn(
              "h-7 flex-1 rounded-md",
              rightPanel === "chat"
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground",
            )}
            onClick={() => setRightPanel("chat")}
          >
            {tReview("assistant.title")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={cn(
              "h-7 flex-1 rounded-md",
              rightPanel === "revisions"
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground",
            )}
            onClick={() => setRightPanel("revisions")}
          >
            {tReview("revisions")}
          </Button>
          {renderAssistantToggle()}
        </div>
        {rightPanel === "chat" ? (
          <OfferChat
            ref={chatRef}
            offer={state.offer}
            className="min-h-0 flex-1 rounded-none border-0 py-0 shadow-none ring-0"
            onOfferChanged={refreshOffer}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin]">
            <OfferRevisionTimeline
              revisions={revisions}
              loading={revisionsLoading}
              onSelect={setSelectedRevision}
            />
          </div>
        )}
      </div>
    );
  }

  if (state.offer.status === "accepted") {
    return (
      <section className={cn(paneScrollClass, "pr-2 xl:pr-3")}>
        <OfferAcceptedView offer={state.offer} onBackToDraft={() => void handleBackToDraft()} />
      </section>
    );
  }

  return (
    <section className="h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0">
        {assistantOpen ? (
          <ResizablePanelGroup
            orientation={isWideLayout ? "horizontal" : "vertical"}
            className="min-h-0 overflow-hidden rounded-xl"
          >
            <ResizablePanel
              id="offer-review"
              defaultSize={isWideLayout ? "66%" : "58%"}
              minSize={isWideLayout ? "54%" : "42%"}
              maxSize={isWideLayout ? "74%" : "70%"}
              className="min-h-0"
            >
              <div className={cn(paneScrollClass, "pr-2 xl:pr-3")}>
                <OfferBuilder
                  offer={state.offer}
                  onDiscountPercentChange={handleDiscountPercentChange}
                  onOfferChange={handleOfferChange}
                  onAccepted={handleOfferChange}
                  onSendToChat={handleSendToChat}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle aria-label={tReview("resizeLabel")} />

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
              <div className="h-full min-h-0 overflow-hidden pt-2 xl:pl-2 xl:pt-0">
                {renderRightPanel()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className={cn(paneScrollClass, "pr-2 xl:pr-3")}>
            <OfferBuilder
              offer={state.offer}
              onDiscountPercentChange={handleDiscountPercentChange}
              onOfferChange={handleOfferChange}
              onAccepted={handleOfferChange}
              onSendToChat={handleSendToChat}
              assistantToggle={renderAssistantToggle()}
            />
          </div>
        )}
      </div>

      <OfferRevisionModal
        revision={selectedRevision}
        offerId={offerId}
        open={selectedRevision !== null}
        onClose={() => setSelectedRevision(null)}
        onRestored={() => {
          refreshOffer();
          void loadRevisions();
        }}
      />
    </section>
  );
}
