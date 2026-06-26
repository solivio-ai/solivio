"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@solivio/ui/components/sheet.tsx";

import type { MapArticle } from "../lib/mapTypes.ts";

type Props = {
  article: MapArticle | null;
  onClose: () => void;
  note?: string;
  spaceName?: string;
};

export function ArticleDrawer({ article, onClose, note, spaceName }: Props) {
  const t = useTranslations("knowledge-base.drawer");
  const pathname = usePathname();
  const inKb = pathname.startsWith("/knowledge-base");
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!article) {
      setFullBody(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFullBody(null);
    fetch(`/api/knowledge-base/articles/${article.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setFullBody(data.body ?? "");
      })
      .catch(() => {
        if (!cancelled) setFullBody(article.body);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article?.id]);

  const body = fullBody ?? article?.body ?? "";

  return (
    <Sheet open={!!article} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {article && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8 leading-snug">{article.title}</SheetTitle>
              <div className="flex flex-col gap-2 mt-2">
                {spaceName && (
                  <Badge variant="outline" className="text-xs w-fit">
                    {spaceName}
                  </Badge>
                )}
                {!inKb && (
                  <Button variant="outline" size="sm" asChild className="w-fit">
                    <Link href={`/knowledge-base/${article.spaceId}?article=${article.id}`}>
                      <ExternalLink size={13} />
                      {t("viewInKb")}
                    </Link>
                  </Button>
                )}
              </div>
            </SheetHeader>
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {note && (
                <p className="mb-4 text-xs italic text-muted-foreground/70 border-l-2 border-border pl-3">
                  {note}
                </p>
              )}
              {article.updatedAt && (
                <p className="mb-3 text-xs text-muted-foreground/60">
                  {t("updated")} {new Date(article.updatedAt).toLocaleDateString()}
                </p>
              )}
              {loading ? (
                <p className="text-muted-foreground/50 animate-pulse">{t("loading")}</p>
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
                <p className="leading-relaxed">{t("noContent")}</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
