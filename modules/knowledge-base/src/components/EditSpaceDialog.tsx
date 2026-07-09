"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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

import type { MapSpace } from "../lib/mapTypes.ts";

type Props = {
  space: MapSpace | null;
  onClose: () => void;
  onSaved: (updated: Pick<MapSpace, "id" | "name" | "color">) => void;
};

export function EditSpaceDialog({ space, onClose, onSaved }: Props) {
  const t = useTranslations("knowledge-base.editSpace");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (space) {
      setName(space.name);
      setColor(space.color ?? null);
    }
  }, [space]);

  const handleSave = async () => {
    if (!space || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge-base/spaces/${space.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!res.ok) throw new Error("Failed");
      onSaved({ id: space.id, name: name.trim(), color });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!space} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-space-name">{t("nameLabel")}</Label>
            <Input
              id="edit-space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("colorLabel")}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
