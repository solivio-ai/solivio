"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, NodeToolbar, Position } from "@xyflow/react";
import { FileText, Folder, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { cn } from "@solivio/ui/lib/utils.ts";

export type ArticleNodeData = {
  title: string;
  body: string;
  type: string;
  updatedAt: string;
  hasChildren: boolean;
  onClick: () => void;
  onAddChild: () => void;
  onDelete: () => void;
};

export function ArticleNode({ data, selected }: NodeProps<Node<ArticleNodeData>>) {
  const t = useTranslations("knowledge-base");
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToolbar = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  };

  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <>
      <NodeToolbar isVisible={hovered} position={Position.Bottom} offset={6}>
        <div
          role="toolbar"
          className="flex gap-1.5"
          onMouseEnter={showToolbar}
          onMouseLeave={scheduleHide}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddChild();
            }}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Plus size={11} />
            {t("addNode.addChild")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete();
            }}
            className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-card px-2.5 py-1 text-xs font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={11} />
            {t("node.delete")}
          </button>
        </div>
      </NodeToolbar>

      <button
        type="button"
        onClick={data.onClick}
        onMouseEnter={showToolbar}
        onMouseLeave={scheduleHide}
        className={cn(
          "w-[220px] cursor-pointer select-none rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-ring/30",
          data.hasChildren ? "border-primary/40" : "border-border",
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-border !bg-background"
        />

        <div className="mb-1.5 flex items-start gap-2">
          {data.type === "directory" ? (
            <Folder size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          ) : (
            <FileText size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          )}
          <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-card-foreground">
            {data.title}
          </p>
        </div>

        {data.body && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {data.body}
          </p>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-border !bg-background"
        />
      </button>
    </>
  );
}
