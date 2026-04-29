"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Offer } from "@solivio/domain";
import { DefaultChatTransport } from "ai";
import { ArrowUp, User } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OfferChatProps = {
  offer?: Offer;
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

function renderMarkdownLine(line: string, index: number) {
  const orderedItem = line.match(/^(\d+)\.\s+(.*)$/);
  if (orderedItem) {
    return (
      <p key={index} className="pl-5 -indent-5">
        <span className="font-medium tabular-nums">{orderedItem[1]}.</span>{" "}
        {renderInlineMarkdown(orderedItem[2])}
      </p>
    );
  }

  const unorderedItem = line.match(/^-\s+(.*)$/);
  if (unorderedItem) {
    return (
      <p key={index} className="pl-5 -indent-4">
        <span aria-hidden="true">-</span> {renderInlineMarkdown(unorderedItem[1])}
      </p>
    );
  }

  if (!line.trim()) {
    return <div key={index} className="h-2" />;
  }

  return <p key={index}>{renderInlineMarkdown(line)}</p>;
}

function MarkdownMessage({ children }: { children: string }) {
  return (
    <div className="space-y-1">
      {children.split("\n").map((line, index) => renderMarkdownLine(line, index))}
    </div>
  );
}

export function OfferChat({ offer }: OfferChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: offer ? { offer } : undefined
      }),
    [offer]
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  // Buggy keep commented for now
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage({ text });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function sendSuggestion(question: string) {
    if (isLoading) return;
    void sendMessage({ text: question });
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                isLoading ? "bg-yellow-500" : "bg-green-600"
              )}
            />
            {isLoading ? "Thinking" : "Ready"}
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                disabled={isLoading}
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
              disabled={isLoading}
              placeholder="Tell the AI what to change or ask..."
              className="min-h-9 max-h-40 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
              rows={1}
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={isLoading || !input.trim()}
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
