"use client";

import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@solivio/ui/components/badge.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@solivio/ui/components/sheet.tsx";

import type { MapArticle } from "../lib/mapTypes.ts";

type Props = {
  article: MapArticle | null;
  onClose: () => void;
};

export function ArticleDrawer({ article, onClose }: Props) {
  const t = useTranslations("knowledge-base.drawer");

  return (
    <Sheet open={!!article} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {article && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 leading-snug">{article.title}</SheetTitle>
              <Badge variant="outline" className="w-fit capitalize mt-2">
                {article.type}
              </Badge>
            </SheetHeader>
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {article.updatedAt && (
                <p className="mb-3 text-xs text-muted-foreground/60">
                  {t("updated")} {new Date(article.updatedAt).toLocaleDateString()}
                </p>
              )}
              {article.body ? (
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
                  {article.body}
                </ReactMarkdown>
              ) : (
                <p className="leading-relaxed">{t("noContent")}</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
