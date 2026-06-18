"use client";

import { GripVertical, Plus, PlusCircle, Settings, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@solivio/ui/components/alert-dialog.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

import type { MapArticle, MapConnection, MapSpace } from "../lib/mapTypes.ts";
import { AddNodeDialog } from "./AddNodeDialog.tsx";
import { ArticleDrawer } from "./ArticleDrawer.tsx";
import { EditSpaceDialog } from "./EditSpaceDialog.tsx";
import { NewSpaceDialog } from "./NewSpaceDialog.tsx";

const SpaceMap = dynamic(() => import("./SpaceMap.tsx").then((m) => ({ default: m.SpaceMap })), {
  ssr: false,
  loading: () => <LoadingMap />,
});

function LoadingMap() {
  const t = useTranslations("knowledge-base.shell");
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {t("loadingMap")}
    </div>
  );
}

type Props = {
  spaces: MapSpace[];
  activeSpaceId: string;
  articles: MapArticle[];
  connections: MapConnection[];
};

export function KnowledgeBaseShell({ spaces, activeSpaceId, articles, connections }: Props) {
  const t = useTranslations("knowledge-base.shell");
  const router = useRouter();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [newSpaceOpen, setNewSpaceOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [localSpaces, setLocalSpaces] = useState<MapSpace[]>(spaces);
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<MapSpace | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<MapSpace | null>(null);
  const draggedId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const selectedArticle = selectedArticleId
    ? (articles.find((a) => a.id === selectedArticleId) ?? null)
    : null;

  // ── Drag-to-reorder ────────────────────────────────────────────────────────

  const handleDragStart = (id: string) => {
    draggedId.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverId.current = id;
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = draggedId.current;
    if (!fromId || fromId === targetId) return;

    setLocalSpaces((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.id === fromId);
      const toIdx = next.findIndex((s) => s.id === targetId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const withOrder = next.map((s, i) => ({ ...s, sortOrder: i }));
      persistOrder(withOrder);
      return withOrder;
    });

    draggedId.current = null;
    dragOverId.current = null;
  };

  const handleDragEnd = () => {
    draggedId.current = null;
    dragOverId.current = null;
  };

  const persistOrder = (ordered: MapSpace[]) => {
    fetch("/api/knowledge-base/spaces/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ordered.map((s, i) => ({ id: s.id, sortOrder: i })) }),
    });
  };

  // ── Delete space ───────────────────────────────────────────────────────────

  const handleDeleteSpace = (id: string) => {
    const space = localSpaces.find((s) => s.id === id);
    if (space) setDeletingSpace(space);
  };

  const confirmDeleteSpace = async () => {
    if (!deletingSpace) return;
    const id = deletingSpace.id;
    setDeletingSpace(null);
    setLocalSpaces((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/knowledge-base/spaces/${id}`, { method: "DELETE" });
    if (id === activeSpaceId) router.push("/knowledge-base");
  };

  // ──────────────────────────────────────────────────────────────────────────

  const displaySpaces = managing ? localSpaces : spaces;

  return (
    <div className="flex min-h-0 overflow-hidden rounded-lg border border-border bg-card">
      {/* Spaces sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/30">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("spaces")}
          </span>
          {!managing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewSpaceOpen(true)}
              title={t("newSpace")}
            >
              <Plus size={14} />
            </Button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {displaySpaces.map((space) =>
            managing ? (
              <div
                key={space.id}
                draggable
                onDragStart={() => handleDragStart(space.id)}
                onDragOver={(e) => handleDragOver(e, space.id)}
                onDrop={(e) => handleDrop(e, space.id)}
                onDragEnd={handleDragEnd}
                className="group flex cursor-grab items-center gap-1.5 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-accent active:cursor-grabbing"
              >
                <GripVertical size={14} className="shrink-0 text-muted-foreground/50" />
                {space.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: space.color }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setEditingSpace(space)}
                  className="flex-1 truncate text-left text-sm hover:underline"
                >
                  {space.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSpace(space.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <Link
                key={space.id}
                href={`/knowledge-base/${space.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  space.id === activeSpaceId
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {space.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: space.color }}
                  />
                )}
                <span className="truncate">{space.name}</span>
              </Link>
            ),
          )}
        </nav>

        <div className="border-t border-border px-2 py-2">
          {managing ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-1.5 text-xs"
              onClick={() => setManaging(false)}
            >
              <X size={13} />
              {t("manage.done")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setLocalSpaces(spaces);
                setManaging(true);
              }}
            >
              <Settings size={13} />
              {t("manage.button")}
            </Button>
          )}
        </div>
      </aside>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1">
        {articles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-sm text-muted-foreground">{t("emptySpace")}</p>
            <Button onClick={() => setAddNodeOpen(true)} className="gap-2">
              <PlusCircle size={16} />
              {t("addFirst")}
            </Button>
          </div>
        ) : (
          <SpaceMap
            articles={articles}
            connections={connections}
            spaceId={activeSpaceId}
            onArticleClick={setSelectedArticleId}
          />
        )}
      </div>

      <AlertDialog open={!!deletingSpace} onOpenChange={(o) => !o && setDeletingSpace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manage.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.deleteDesc", { name: deletingSpace?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("manage.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSpace}>
              {t("manage.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArticleDrawer article={selectedArticle} onClose={() => setSelectedArticleId(null)} />
      <NewSpaceDialog open={newSpaceOpen} onClose={() => setNewSpaceOpen(false)} />
      <EditSpaceDialog
        space={editingSpace}
        onClose={() => setEditingSpace(null)}
        onSaved={(updated) => {
          setLocalSpaces((prev) =>
            prev.map((s) =>
              s.id === updated.id ? { ...s, name: updated.name, color: updated.color } : s,
            ),
          );
          setEditingSpace(null);
        }}
      />
      <AddNodeDialog
        open={addNodeOpen}
        spaceId={activeSpaceId}
        parentId={null}
        parentPosition={null}
        onClose={() => setAddNodeOpen(false)}
        onCreated={() => { setAddNodeOpen(false); router.refresh(); }}
      />
    </div>
  );
}
