"use client";

import { FileText, Folder } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@solivio/ui/components/dialog.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { Label } from "@solivio/ui/components/label.tsx";
import { Textarea } from "@solivio/ui/components/textarea.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

import type { MapArticle } from "../lib/mapTypes.ts";

type NodeType = "article" | "directory";

type Props = {
  open: boolean;
  spaceId: string;
  parentId: string | null;
  parentPosition: { x: number; y: number } | null;
  onClose: () => void;
  onCreated: (article: MapArticle) => void;
};

const TYPE_OPTIONS: { value: NodeType; icon: React.ElementType }[] = [
  { value: "article", icon: FileText },
  { value: "directory", icon: Folder },
];

export function AddNodeDialog({
  open,
  spaceId,
  parentId,
  parentPosition,
  onClose,
  onCreated,
}: Props) {
  const t = useTranslations("knowledge-base.addNode");
  const [type, setType] = useState<NodeType>("article");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("article");
    setTitle("");
    setBody("");
    setDescription("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (type === "article" && !body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge-base/spaces/${spaceId}/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: type === "article" ? body : description,
          type,
          parentId,
          ...(parentPosition
            ? { positionX: parentPosition.x, positionY: parentPosition.y + 220 }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const row = await res.json();
      onCreated({
        id: row.id,
        spaceId: row.spaceId,
        parentId: row.parentId,
        title: row.title,
        body: row.body,
        type: row.type,
        positionX: row.positionX,
        positionY: row.positionY,
        updatedAt: row.updatedAt,
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {/* Type choice cards */}
        <div className="grid grid-cols-2 gap-3">
          {TYPE_OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                type === value ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Icon
                size={20}
                className={type === value ? "text-primary" : "text-muted-foreground"}
              />
              <div>
                <p className="text-sm font-medium">{t(`type.${value}.label`)}</p>
                <p className="text-xs text-muted-foreground">{t(`type.${value}.desc`)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="add-node-title">{t("nameLabel")}</Label>
            <Input
              id="add-node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !saving && handleSubmit()}
              placeholder={t(
                type === "article" ? "namePlaceholderArticle" : "namePlaceholderDirectory",
              )}
              autoFocus
            />
          </div>

          {type === "article" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="add-node-body">{t("bodyLabel")}</Label>
              <Textarea
                id="add-node-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-64"
                placeholder={t("bodyPlaceholder")}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="add-node-desc">
                {t("descLabel")}{" "}
                <span className="text-muted-foreground text-xs">({t("optional")})</span>
              </Label>
              <Input
                id="add-node-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || (type === "article" && !body.trim())}
          >
            {saving ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
