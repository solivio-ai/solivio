"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

import type { MapArticle } from "../lib/mapTypes.ts";

type TreeNode = {
  article: MapArticle;
  children: TreeNode[];
  depth: number;
};

function buildTree(articles: MapArticle[]): TreeNode[] {
  const childrenOf = new Map<string | null, MapArticle[]>();
  for (const a of articles) {
    const key = a.parentId ?? null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(a);
  }

  function buildNodes(parentId: string | null, depth: number): TreeNode[] {
    return (childrenOf.get(parentId) ?? []).map((a) => ({
      article: a,
      children: buildNodes(a.id, depth + 1),
      depth,
    }));
  }

  return buildNodes(null, 0);
}

function filterByQuery(articles: MapArticle[], query: string): MapArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return articles;

  const byId = new Map(articles.map((a) => [a.id, a]));
  const matched = new Set(
    articles.filter((a) => a.title.toLowerCase().includes(q)).map((a) => a.id),
  );

  // Include ancestors of every match so the tree makes sense
  const toInclude = new Set(matched);
  for (const id of matched) {
    let cur = byId.get(id);
    while (cur?.parentId) {
      toInclude.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
  }

  return articles.filter((a) => toInclude.has(a.id));
}

type Props = {
  articles: MapArticle[];
  selectedArticleId: string | null;
  onArticleClick: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (article: MapArticle) => void;
};

export function ArticleListView({
  articles,
  selectedArticleId,
  onArticleClick,
  onAdd,
  onDelete,
}: Props) {
  const t = useTranslations("knowledge-base.list");

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSearching = searchQuery.trim().length > 0;
  const displayArticles = isSearching ? filterByQuery(articles, searchQuery) : articles;
  const tree = buildTree(displayArticles);

  function renderNode(node: TreeNode): React.ReactNode {
    const { article, children, depth } = node;
    const isDir = article.type === "directory";
    const hasChildren = children.length > 0;
    // Expand everything when searching so matches are always visible
    const isExpanded = isSearching ? true : expanded.has(article.id);
    const isSelected = article.id === selectedArticleId;

    return (
      <div key={article.id}>
        <div
          className="group flex h-9 items-center rounded-md text-sm transition-colors hover:bg-accent"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Chevron — separate button so it can expand without triggering row action */}
          {hasChildren ? (
            <button
              type="button"
              className="shrink-0 p-0.5 text-muted-foreground"
              onClick={() => !isSearching && toggle(article.id)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}

          {/* Main clickable area */}
          <button
            type="button"
            className={cn(
              "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 pr-1",
              isSelected && "font-medium",
            )}
            onClick={() => {
              if (isDir && !hasChildren) toggle(article.id);
              else onArticleClick(article.id);
            }}
          >
            {isDir ? (
              <Folder size={14} className="shrink-0 text-muted-foreground" />
            ) : (
              <FileText size={14} className="shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate text-left">{article.title}</span>
            <span className="mr-1 shrink-0 text-xs text-muted-foreground/60 group-hover:hidden">
              {new Date(article.updatedAt).toLocaleDateString()}
            </span>
          </button>

          {/* Row actions */}
          <div className="shrink-0 pr-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem onClick={() => onAdd(article.id)}>
                  {t("addChild")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(article)}
                >
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasChildren && isExpanded && children.map((child) => renderNode(child))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 pl-7 text-sm"
          />
          {isSearching && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Button size="sm" className="shrink-0 gap-1.5" onClick={() => onAdd(null)}>
          <Plus size={14} />
          {t("add")}
        </Button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {articles.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : isSearching && displayArticles.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}
