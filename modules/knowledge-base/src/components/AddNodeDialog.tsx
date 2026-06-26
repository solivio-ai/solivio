"use client";

import { FileText, Folder, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

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

type NodeType = "article" | "directory" | "upload";

type Props = {
  open: boolean;
  spaceId: string;
  parentId: string | null;
  parentPosition: { x: number; y: number } | null;
  onClose: () => void;
  onCreated: (article: MapArticle) => void;
  // Edit mode — when articleId is provided the dialog PATCHes instead of POSTing
  articleId?: string;
  initialValues?: { title: string; body: string; type: NodeType };
  onUpdated?: (article: MapArticle) => void;
};

const CREATE_TYPE_OPTIONS: { value: NodeType; icon: React.ElementType }[] = [
  { value: "article", icon: FileText },
  { value: "directory", icon: Folder },
  { value: "upload", icon: Upload },
];

const EDIT_TYPE_OPTIONS: { value: NodeType; icon: React.ElementType }[] = [
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
  articleId,
  initialValues,
  onUpdated,
}: Props) {
  const t = useTranslations("knowledge-base.addNode");
  const isEdit = !!articleId;

  const [type, setType] = useState<NodeType>(initialValues?.type ?? "article");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(
    initialValues?.type !== "directory" ? (initialValues?.body ?? "") : "",
  );
  const [description, setDescription] = useState(
    initialValues?.type === "directory" ? (initialValues?.body ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-populate form whenever the dialog opens (handles opening for different articles)
  useEffect(() => {
    if (open) {
      setType(initialValues?.type ?? "article");
      setTitle(initialValues?.title ?? "");
      if (initialValues?.type === "directory") {
        setBody("");
        setDescription(initialValues.body ?? "");
      } else {
        setBody(initialValues?.body ?? "");
        setDescription("");
      }
    }
  }, [open, initialValues?.type, initialValues?.title, initialValues?.body]);

  const reset = () => {
    setType("article");
    setTitle("");
    setBody("");
    setDescription("");
    setExtracting(false);
    setExtractError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (file: File) => {
    setExtractError(false);
    setExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/knowledge-base/extract-text", { method: "POST", body: form });
      if (!res.ok) throw new Error("extraction failed");
      const data = await res.json();
      setTitle(data.title ?? "");
      setBody(data.body ?? "");
    } catch {
      setExtractError(true);
    } finally {
      setExtracting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if ((type === "article" || type === "upload") && !isEdit && !body.trim()) return;
    setSaving(true);
    const savedType = type === "upload" ? "article" : type;
    try {
      const payload = {
        title: title.trim(),
        body: savedType === "article" ? body : description,
        type: savedType,
      };

      if (isEdit) {
        const res = await fetch(`/api/knowledge-base/articles/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        const row = await res.json();
        onUpdated?.({
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
      } else {
        const res = await fetch(`/api/knowledge-base/spaces/${spaceId}/articles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
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
      }
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("title")}</DialogTitle>
        </DialogHeader>

        {/* Type choice cards */}
        <div className="grid grid-cols-3 gap-3">
          {(isEdit ? EDIT_TYPE_OPTIONS : CREATE_TYPE_OPTIONS).map(({ value, icon: Icon }) => (
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
          {type === "upload" && (
            <div className="grid gap-1.5">
              <Label htmlFor="add-node-file">{t("upload.fileLabel")}</Label>
              <label
                htmlFor="add-node-file"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm transition-colors hover:bg-accent",
                  extracting ? "opacity-60 pointer-events-none" : "border-border",
                )}
              >
                <Upload size={20} className="text-muted-foreground" />
                <span className="text-muted-foreground">
                  {extracting ? t("upload.extracting") : t("upload.dropHint")}
                </span>
                <span className="text-xs text-muted-foreground/60">{t("upload.accepts")}</span>
                {extractError && (
                  <span className="text-xs text-destructive">{t("upload.error")}</span>
                )}
              </label>
              <input
                ref={fileInputRef}
                id="add-node-file"
                type="file"
                accept=".txt,.md,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="add-node-title">{t("nameLabel")}</Label>
            <Input
              id="add-node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !saving && handleSubmit()}
              placeholder={t(
                type === "directory" ? "namePlaceholderDirectory" : "namePlaceholderArticle",
              )}
              autoFocus
            />
          </div>

          {type === "article" || type === "upload" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="add-node-body">{t("bodyLabel")}</Label>
              <Textarea
                id="add-node-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-64"
                placeholder={extracting ? t("upload.extracting") : t("bodyPlaceholder")}
                disabled={extracting}
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="add-node-desc">
                {t("descLabel")}{" "}
                <span className="text-xs text-muted-foreground">({t("optional")})</span>
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
            disabled={
              saving ||
              extracting ||
              !title.trim() ||
              (!isEdit && (type === "article" || type === "upload") && !body.trim())
            }
          >
            {saving ? (isEdit ? t("saving") : t("creating")) : isEdit ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
