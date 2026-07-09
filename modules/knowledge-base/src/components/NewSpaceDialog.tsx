"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import { ColorPicker } from "@solivio/ui/components/color-picker.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@solivio/ui/components/dialog.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { Label } from "@solivio/ui/components/label.tsx";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewSpaceDialog({ open, onClose }: Props) {
  const t = useTranslations("knowledge-base.dialog");
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setColor(null);
  };

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge-base/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!res.ok) throw new Error("Failed to create space");
      const space = await res.json();
      reset();
      onClose();
      router.push(`/knowledge-base/${space.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="space-name">{t("nameLabel")}</Label>
            <Input
              id="space-name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("colorLabel")}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
