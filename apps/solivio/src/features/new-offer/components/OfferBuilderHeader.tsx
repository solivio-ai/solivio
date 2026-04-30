"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

import type { Offer } from "@solivio/domain";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SaveState } from "./offer-builder-types";

function isPersistedOfferId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

type OfferBuilderHeaderProps = {
  generatedDate: string;
  lineCount: number;
  offerTitle: string;
  status: Offer["status"];
  createdBy?: { id: string; name: string } | null;
  createdAt?: string;
  updatedBy?: { id: string; name: string } | null;
  updatedAt?: string;
};

type OfferBuilderActionBarProps = {
  assistantToggle?: ReactNode;
  compact: boolean;
  formCustomerName: string;
  formName: string;
  offerId: string;
  offerTitle: string;
  onAccept: () => void;
  onReopen: () => void;
  onValidate: () => void;
  validateState: "idle" | "loading";
  onAddProduct: () => void;
  onRetrySave: () => void;
  saveState: SaveState;
  status: Offer["status"];
  onUpdate?: (offer: Offer) => void;
};

export function OfferBuilderHeader({
  generatedDate,
  lineCount,
  offerTitle,
  status,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: OfferBuilderHeaderProps) {
  const t = useTranslations("NewOffer.builder");

  const statusLabel = status === "accepted" ? t("status.accepted") : t("status.draft");

  return (
    <header className="grid min-w-0 gap-2 rounded-xl border border-foreground/15 bg-card p-3 shadow-sm">
      <div className="grid min-w-0 gap-2">
        <h1 className="truncate text-lg leading-tight font-semibold">{offerTitle}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={status === "accepted" ? "default" : "outline"}>{statusLabel}</Badge>
          <Badge variant="secondary">{t("productCount", { count: lineCount })}</Badge>
          <Badge variant="outline">{t("generated", { date: generatedDate })}</Badge>
        </div>
        {(createdBy?.name || updatedBy?.name) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {createdBy?.name && (
              <span
                className="flex items-center gap-1"
                title={createdAt ? new Date(createdAt).toLocaleString("pl-PL") : undefined}
              >
                <User size={11} aria-hidden="true" />
                {t("createdBy", { name: createdBy.name })}
              </span>
            )}
            {updatedBy?.name && (
              <span
                className="flex items-center gap-1"
                title={updatedAt ? new Date(updatedAt).toLocaleString("pl-PL") : undefined}
              >
                <User size={11} aria-hidden="true" />
                {t("lastModifiedBy", { name: updatedBy.name })}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function OfferBuilderActionBar({
  assistantToggle,
  compact,
  formCustomerName,
  formName,
  offerId,
  offerTitle,
  onAccept,
  onReopen,
  onValidate,
  validateState,
  onAddProduct,
  onRetrySave,
  saveState,
  status,
  onUpdate,
}: OfferBuilderActionBarProps) {
  const router = useRouter();
  const t = useTranslations("NewOffer.builder");
  const tSave = useTranslations("NewOffer.builder.save");
  const tReview = useTranslations("NewOffer.review");
  const tList = useTranslations("OffersList");

  const persisted = isPersistedOfferId(offerId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(formName);
  const [editCustomer, setEditCustomer] = useState(formCustomerName);

  const onEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (open) {
      setEditName(formName);
      setEditCustomer(formCustomerName);
    }
  };

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, { method: "DELETE" });
      if (!response.ok) return;
      setDeleteOpen(false);
      router.push("/offers");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          customerName: editCustomer.trim() ? editCustomer.trim() : null,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (payload?.offer) {
        onUpdate?.(payload.offer as Offer);
      }
      onEditOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const saveStatus =
    saveState === "saving"
      ? {
          Icon: Loader2,
          className: "text-muted-foreground",
          iconClassName: "animate-spin",
          label: tSave("saving")
        }
      : saveState === "saved"
        ? {
            Icon: CheckCircle2,
            className: "text-muted-foreground",
            iconClassName: "text-primary",
            label: tSave("saved")
          }
        : saveState === "error"
          ? {
              Icon: AlertCircle,
              className: "text-destructive",
              iconClassName: "text-destructive",
              label: tSave("error")
            }
          : null;
  const SaveStatusIcon = saveStatus?.Icon;

  const statusLabel = status === "accepted" ? t("status.accepted") : t("status.draft");

  return (
    <div className="sticky bottom-2 z-30 -mx-1 px-1 pt-1">
      <div className="mx-auto flex w-full flex-col gap-2 rounded-xl border border-foreground/15 bg-card/95 p-2 m-0! ring-1 ring-background/80 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant={status === "accepted" ? "default" : "outline"} className="shrink-0">
            {statusLabel}
          </Badge>
          {saveStatus && SaveStatusIcon ? (
            <div className={`flex min-w-0 items-center gap-2 text-xs ${saveStatus.className}`}>
              <SaveStatusIcon size={14} aria-hidden="true" className={saveStatus.iconClassName} />
              <span className={compact ? "sr-only lg:not-sr-only" : "truncate"}>
                {saveStatus.label}
              </span>
              {saveState === "error" ? (
                <Button type="button" size="sm" variant="outline" onClick={onRetrySave}>
                  <RotateCcw size={14} aria-hidden="true" />
                  <span className={compact ? "sr-only sm:not-sr-only" : ""}>
                    {tSave("retry")}
                  </span>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Button
            className={compact ? "sm:w-auto" : "w-full sm:w-auto"}
            size="sm"
            variant="outline"
            onClick={onAddProduct}
            disabled={status === "accepted"}
          >
            <Plus size={16} aria-hidden="true" />
            <span className={compact ? "sr-only md:not-sr-only" : ""}>{t("addProduct")}</span>
          </Button>
          {status === "accepted" ? (
            <Button
              className={compact ? "sm:w-auto" : "w-full sm:w-auto"}
              size="sm"
              variant="secondary"
              onClick={onReopen}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span className={compact ? "sr-only md:not-sr-only" : ""}>
                {t("backToDraft")}
              </span>
            </Button>
          ) : (
            <>
              <Button
                className={compact ? "sm:w-auto" : "w-full sm:w-auto"}
                size="sm"
                variant="outline"
                onClick={onAccept}
                disabled={saveState === "saving"}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                <span className={compact ? "hidden xl:inline" : ""}>
                  {tReview("validation.acceptWithoutAi")}
                </span>
                <span className={compact ? "hidden sm:inline xl:hidden" : "hidden"}>
                  {t("acceptDraft")}
                </span>
                <span className={compact ? "sr-only sm:hidden" : "hidden"}>
                  {tReview("validation.acceptWithoutAi")}
                </span>
              </Button>
              <Button
                className={compact ? "sm:w-auto" : "w-full sm:w-auto"}
                size="sm"
                onClick={onValidate}
                disabled={validateState === "loading"}
              >
                {validateState === "loading" ? (
                  <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} aria-hidden="true" />
                )}
                <span className={compact ? "sr-only sm:not-sr-only" : ""}>
                  {validateState === "loading" ? tReview("validation.checking") : tReview("validation.checkWithAI")}
                </span>
              </Button>
            </>
          )}
          {persisted ? (
            <>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label={tList("actions.openActions", { name: offerTitle })}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{tList("actions.offerActions")}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>{tList("table.actions")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      onEditOpenChange(true);
                    }}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    {tList("actions.editDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {tList("actions.deleteOffer")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{tList("actions.editDetailsTitle")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`offer-builder-edit-name-${offerId}`}>
                      {tList("actions.fieldName")}
                    </Label>
                    <Input
                      id={`offer-builder-edit-name-${offerId}`}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`offer-builder-edit-customer-${offerId}`}>
                      {tList("actions.fieldCustomerName")}
                    </Label>
                    <Input
                      id={`offer-builder-edit-customer-${offerId}`}
                      value={editCustomer}
                      onChange={(event) => setEditCustomer(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => onEditOpenChange(false)}>
                    {tList("actions.deleteCancel")}
                  </Button>
                  <Button
                    type="button"
                    disabled={saving || !editName.trim()}
                    onClick={() => void handleSaveEdit()}
                  >
                    {tList("actions.saveChanges")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tList("actions.deleteOfferConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tList("actions.deleteOfferConfirmDescription", { name: offerTitle })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>{tList("actions.deleteCancel")}</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                  >
                    {tList("actions.deleteOfferConfirm")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
        {assistantToggle}
      </div>
      </div>
    </div>
  );
}
