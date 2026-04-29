"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Offer } from "@solivio/domain";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Plus, User } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OfferChatProps = {
  offer?: Offer;
};

type OfferChatThread = {
  id: string;
  offerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const questionSuggestions = [
  "Summarize client request",
  "List 3 most expensive items in offer",
  "Suggest additional products for upsell"
];

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

/** ATX headings: ### Title (optional trailing # trimmed per CommonMark) */
function renderHeading(line: string, index: number): ReactNode {
  const match = line.match(/^(#{1,6})\s+(.*?)(\s+#*)?$/);
  if (!match) return null;

  const level = match[1].length;
  const raw = match[2].trimEnd();
  const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const size =
    level <= 2 ? "text-[0.9375rem] font-semibold leading-snug" : "text-sm font-semibold leading-snug";

  return createElement(
    tag,
    {
      key: index,
      className: cn(size, index > 0 ? "mt-2.5" : "")
    },
    renderInlineMarkdown(raw)
  );
}

function renderMarkdownLine(line: string, index: number) {
  const trimmed = line.trim();

  if (!trimmed) {
    return <div key={index} className="h-2" />;
  }

  const lead = line.match(/^\s*/)?.[0] ?? "";
  const indentClass = lead.length >= 2 ? "pl-2" : "";

  const heading = renderHeading(trimmed, index);
  if (heading) return heading;

  const orderedItem = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
  if (orderedItem) {
    return (
      <p key={index} className={cn("pl-5 -indent-5", indentClass)}>
        <span className="font-medium tabular-nums">{orderedItem[1]}.</span>{" "}
        {renderInlineMarkdown(orderedItem[2])}
      </p>
    );
  }

  const unorderedItem = trimmed.match(/^[-*•–—]\s+(.*)$/u);
  if (unorderedItem) {
    return (
      <p key={index} className={cn("flex gap-2 pl-1", indentClass)}>
        <span aria-hidden="true" className="font-medium leading-relaxed">
          •
        </span>
        <span className="min-w-0 flex-1 leading-relaxed">{renderInlineMarkdown(unorderedItem[1])}</span>
      </p>
    );
  }

  return (
    <p key={index} className={cn("leading-relaxed", indentClass)}>
      {renderInlineMarkdown(trimmed)}
    </p>
  );
}

function MarkdownMessage({ children }: { children: string }) {
  return (
    <div className="space-y-1">
      {children.split("\n").map((line, index) => renderMarkdownLine(line, index))}
    </div>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: {
        message: text
      }
    };
  }
}

export function OfferChat({ offer }: OfferChatProps) {
  const [threads, setThreads] = useState<OfferChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  /**
   * `useChat` keeps the first `DefaultChatTransport` instance forever unless `id` changes.
   * On mount, `activeThreadId` is still null, so a transport created with inline `body` would
   * never send `offerId` / `threadId`. Merge them on every request instead.
   */
  const offerChatRequestContextRef = useRef<{
    offerId: string | null;
    threadId: string | null;
  }>({ offerId: null, threadId: null });
  offerChatRequestContextRef.current = {
    offerId: offer?.id ?? null,
    threadId: activeThreadId
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        prepareSendMessagesRequest: ({ body, id, messages, trigger, messageId }) => {
          const ctx = offerChatRequestContextRef.current;
          const threadBody =
            ctx.offerId && ctx.threadId
              ? { offerId: ctx.offerId, threadId: ctx.threadId }
              : {};

          return {
            body: {
              ...body,
              id,
              messages,
              trigger,
              messageId,
              ...threadBody
            }
          };
        }
      }),
    []
  );
  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";
  const isInputDisabled = isLoading || isThreadLoading || Boolean(offer && !activeThreadId);

  const refreshThreads = useCallback(async () => {
    if (!offer) return [] as OfferChatThread[];

    const response = await fetch(`/api/offers/${offer.id}/chat/threads`);
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Could not load chat threads.");
    }

    const nextThreads = payload.threads as OfferChatThread[];
    setThreads(nextThreads);
    return nextThreads;
  }, [offer]);

  const loadThreadMessages = useCallback(
    async (threadId: string) => {
      if (!offer) return;

      const response = await fetch(`/api/offers/${offer.id}/chat/threads/${threadId}/messages`);
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Could not load chat messages.");
      }

      setMessages(payload.messages as UIMessage[]);
    },
    [offer, setMessages]
  );

  const createThread = useCallback(async () => {
    if (!offer) return null;

    const response = await fetch(`/api/offers/${offer.id}/chat/threads`, { method: "POST" });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Could not create chat thread.");
    }

    return payload.thread as OfferChatThread;
  }, [offer]);

  // Buggy keep commented for now
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  async function sendText(text: string) {
    if (!text || isInputDisabled) return;

    await sendMessage({ text });
    if (offer) {
      await refreshThreads().catch(() => undefined);
    }
  }

  function submit() {
    const text = input.trim();
    if (!text || isInputDisabled) return;
    setInput("");
    void sendText(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function sendSuggestion(question: string) {
    if (isInputDisabled) return;
    void sendText(question);
  }

  async function startNewThread() {
    if (!offer || isThreadLoading) return;

    setIsThreadLoading(true);
    setThreadError(null);

    try {
      const thread = await createThread();
      if (!thread) return;

      setThreads((current) => [thread, ...current]);
      setActiveThreadId(thread.id);
      setMessages([]);
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Could not start a new chat.");
    } finally {
      setIsThreadLoading(false);
    }
  }

  useEffect(() => {
    if (!offer) return;

    let ignore = false;

    async function loadInitialThread() {
      setIsThreadLoading(true);
      setThreadError(null);

      try {
        let nextThreads = await refreshThreads();

        if (nextThreads.length === 0) {
          const thread = await createThread();
          nextThreads = thread ? [thread] : [];
          if (!ignore) setThreads(nextThreads);
        }

        const nextActiveThreadId = nextThreads[0]?.id ?? null;
        if (!ignore) {
          setActiveThreadId(nextActiveThreadId);
          if (nextActiveThreadId) {
            await loadThreadMessages(nextActiveThreadId);
          } else {
            setMessages([]);
          }
        }
      } catch (error) {
        if (!ignore) {
          setThreadError(error instanceof Error ? error.message : "Could not load chat history.");
          setMessages([]);
        }
      } finally {
        if (!ignore) setIsThreadLoading(false);
      }
    }

    void loadInitialThread();

    return () => {
      ignore = true;
    };
  }, [createThread, loadThreadMessages, offer, refreshThreads, setMessages]);

  async function switchThread(threadId: string) {
    if (!threadId || threadId === activeThreadId || !offer) return;

    setIsThreadLoading(true);
    setThreadError(null);
    setActiveThreadId(threadId);

    try {
      await loadThreadMessages(threadId);
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Could not switch chat thread.");
      setMessages([]);
    } finally {
      setIsThreadLoading(false);
    }
  }

  return (
    <main className="flex h-[calc(100vh-2.5rem)] justify-center bg-background p-4">
      <Card className="flex min-h-0 w-full max-w-md flex-1 gap-0 rounded-2xl py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <Image src="/favicon.png" alt="" width={16} height={16} className="size-4" />
            </span>
            Solivio Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            {offer ? (
              <>
                <select
                  value={activeThreadId ?? ""}
                  onChange={(event) => void switchThread(event.target.value)}
                  disabled={isThreadLoading || isLoading}
                  className="h-7 max-w-32 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground"
                >
                  {threads.map((thread) => (
                    <option key={thread.id} value={thread.id}>
                      {thread.title}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => void startNewThread()}
                  disabled={isThreadLoading || isLoading}
                >
                  <Plus className="size-3" />
                </Button>
              </>
            ) : null}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isLoading ? "bg-yellow-500" : "bg-green-600"
                )}
              />
              {isLoading ? "Thinking" : "Ready"}
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {threadError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {threadError}
            </div>
          ) : null}

          {messages.length === 0 && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Image src="/favicon.png" alt="" width={18} height={18} className="size-[18px]" />
              </div>
              <div className="max-w-[82%] rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed">
                I can explain this offer, summarize the client request, review product matches, and suggest improvements.
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            const textContent = message.parts
              .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
              .map((p) => p.text)
              .join("");

            return (
              <div
                key={message.id}
                className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
              >
                {!isUser && (
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Image
                      src="/favicon.png"
                      alt=""
                      width={18}
                      height={18}
                      className="size-[18px]"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/60 text-foreground"
                  )}
                >
                  {isUser ? textContent : <MarkdownMessage>{textContent}</MarkdownMessage>}
                </div>
                {isUser && (
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 justify-start">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Image src="/favicon.png" alt="" width={18} height={18} className="size-[18px]" />
              </div>
              <div className="rounded-xl border border-border bg-muted/60 px-3.5 py-2.5">
                <span className="flex gap-1 items-center h-5">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-border bg-background px-4 py-3">
          <div className="flex w-full flex-wrap gap-1.5">
            {questionSuggestions.map((question) => (
              <Button
                key={question}
                type="button"
                variant="outline"
                size="xs"
                disabled={isInputDisabled}
                onClick={() => sendSuggestion(question)}
                className="h-6 rounded-full bg-muted/30 px-2 text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
          <div className="flex w-full items-end gap-2 rounded-xl border border-input bg-background p-1.5 focus-within:ring-3 focus-within:ring-ring/50">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isInputDisabled}
              placeholder="Tell the AI what to change or ask..."
              className="min-h-9 max-h-40 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
              rows={1}
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={isInputDisabled || !input.trim()}
              className="size-8 shrink-0 rounded-lg"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
