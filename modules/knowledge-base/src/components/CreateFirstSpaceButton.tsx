"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";

import { NewSpaceDialog } from "./NewSpaceDialog.tsx";

export function CreateFirstSpaceButton() {
  const t = useTranslations("knowledge-base.page");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("emptySpaces.button")}</Button>
      <NewSpaceDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
