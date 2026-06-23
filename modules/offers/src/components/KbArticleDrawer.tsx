"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { OfferKbArticle } from "@solivio/domain";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@solivio/ui/components/sheet.tsx";

type Props = {
  article: OfferKbArticle | null;
  onClose: () => void;
};

export function KbArticleDrawer({ article, onClose }: Props) {
  const t = useTranslations("offers.newOffer.review.summary.kbDrawer");
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!article) {
      setBody(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setBody(null);
    fetch(`/api/knowledge-base/articles/${article.articleId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBody(data.body ?? "");
      })
      .catch(() => {
        if (!cancelled) setBody("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article?.articleId]);

  return (
    <Sheet open={!!article} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {article && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 leading-snug">{article.articleTitle}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {article.spaceName}
                </Badge>
              </div>
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href={`/knowledge-base/${article.spaceId}?article=${article.articleId}`}>
                  <ExternalLink size={13} />
                  {t("viewInKb")}
                </Link>
              </Button>
            </SheetHeader>

            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {article.relevance && (
                <p className="mb-4 text-xs italic text-muted-foreground/70 border-l-2 border-border pl-3">
                  {article.relevance}
                </p>
              )}

              {loading ? (
                <p className="animate-pulse text-muted-foreground/50">Loading…</p>
              ) : body ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-base font-semibold mt-4 mb-2 text-foreground">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-semibold mt-4 mb-1.5 text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-medium mt-3 mb-1 text-foreground">{children}</h3>
                    ),
                    p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="my-2 overflow-x-auto">
                        <table className="w-full border-collapse text-xs">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-muted px-2 py-1 text-left font-medium text-foreground">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-2 py-1">{children}</td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-border pl-3 italic">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-3 border-border" />,
                  }}
                >
                  {body}
                </ReactMarkdown>
              ) : (
                <p>No content.</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
