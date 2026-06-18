"use client";

import { useTranslations } from "next-intl";

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
              <p className="whitespace-pre-wrap leading-relaxed">
                {article.body || t("noContent")}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
