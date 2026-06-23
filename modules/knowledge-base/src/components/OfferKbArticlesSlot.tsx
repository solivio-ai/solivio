"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { OfferKbArticle } from "@solivio/domain";
import { Badge } from "@solivio/ui/components/badge.tsx";

import type { MapArticle } from "../lib/mapTypes.ts";
import { ArticleDrawer } from "./ArticleDrawer.tsx";

type Props = {
  kbArticles: OfferKbArticle[];
};

function toMapArticle(ref: OfferKbArticle): MapArticle {
  return {
    id: ref.articleId,
    spaceId: ref.spaceId,
    parentId: null,
    title: ref.articleTitle,
    body: "",
    type: "article",
    positionX: null,
    positionY: null,
    updatedAt: "",
  };
}

export function OfferKbArticlesSlot({ kbArticles }: Props) {
  const t = useTranslations("knowledge-base");
  const [selected, setSelected] = useState<OfferKbArticle | null>(null);

  if (kbArticles.length === 0) return null;

  return (
    <>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium flex items-center gap-1.5">
          <BookOpen size={14} className="text-muted-foreground" aria-hidden="true" />
          {t("offerSlot.title")}
        </h2>
        <div className="grid gap-2">
          {kbArticles.map((ref) => (
            <button
              key={ref.articleId}
              type="button"
              onClick={() => setSelected(ref)}
              className="cursor-pointer flex items-start gap-3 rounded-lg border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-left w-full transition-colors hover:bg-accent/50 hover:border-foreground/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-medium text-foreground leading-snug">
                    {ref.articleTitle}
                  </span>
                  <Badge variant="outline" className="text-xs py-0 shrink-0">
                    {ref.spaceName}
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">{ref.relevance}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <ArticleDrawer
        article={selected ? toMapArticle(selected) : null}
        note={selected?.relevance}
        spaceName={selected?.spaceName}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
