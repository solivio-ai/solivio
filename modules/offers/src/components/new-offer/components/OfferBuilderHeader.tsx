"use client";

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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

import type { Offer } from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@solivio/ui/components/alert-dialog.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@solivio/ui/components/tooltip.tsx";

import { EditOfferDetailsDialog } from "../../../components/offers-list/components/EditOfferDetailsDialog.tsx";
import type { SaveState } from "./offer-builder-types";

function isPersistedOfferId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

type OfferBuilderHeaderProps = {
  generatedDate: string;
  lineCount: number;
  offerTitle: string;
  status: Offer["status"];
  userName?: string | null;
  createdAt?: string;
};

type OfferBuilderActionBarProps = {
  assistantToggle?: ReactNode;
  compact: boolean;
  formCustomerId: string | null;
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
  userName,
  createdAt,
}: OfferBuilderHeaderProps) {
  const t = useTranslations("offers.newOffer.builder");

  const statusLabel = status === OFFER_STATUS.ACCEPTED ? t("status.accepted") : t("status.draft");

  return (
    <header className="grid min-w-0 gap-2 rounded-xl border border-foreground/15 bg-card p-3 shadow-sm">
      <div className="grid min-w-0 gap-2">
        <h1 className="truncate text-lg leading-tight font-semibold">{offerTitle}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={status === OFFER_STATUS.ACCEPTED ? "default" : "outline"}>
            {statusLabel}
          </Badge>
          <Badge variant="secondary">{t("productCount", { count: lineCount })}</Badge>
          <Badge variant="outline">{t("generated", { date: generatedDate })}</Badge>
        </div>
        {userName && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span
              className="flex items-center gap-1"
              title={createdAt ? new Date(createdAt).toLocaleString("pl-PL") : undefined}
            >
              <User size={11} aria-hidden="true" />
              {t("createdBy", { name: userName })}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export function OfferBuilderActionBar({
  assistantToggle,
  compact,
  formCustomerId,
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
  const t = useTranslations("offers.newOffer.builder");
  const tSave = useTranslations("offers.newOffer.builder.save");
  const tReview = useTranslations("offers.newOffer.review");
  const tList = useTranslations("offers.offersList");

  const persisted = isPersistedOfferId(offerId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const saveStatus =
    saveState === "saving"
      ? {
          Icon: Loader2,
          className: "text-muted-foreground",
          iconClassName: "animate-spin",
          label: tSave("saving"),
        }
      : saveState === "saved"
        ? {
            Icon: CheckCircle2,
            className: "text-muted-foreground",
            iconClassName: "text-primary",
            label: tSave("saved"),
          }
        : saveState === "error"
          ? {
              Icon: AlertCircle,
              className: "text-destructive",
              iconClassName: "text-destructive",
              label: tSave("error"),
            }
          : null;
  const SaveStatusIcon = saveStatus?.Icon;

  const statusLabel = status === OFFER_STATUS.ACCEPTED ? t("status.accepted") : t("status.draft");

  return (
    <div className="sticky bottom-2 z-30 -mx-1 px-1 pt-1">
      <div className="mx-auto flex w-full flex-col gap-2 rounded-xl border border-foreground/15 bg-card/95 p-2 m-0! ring-1 ring-background/80 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant={status === OFFER_STATUS.ACCEPTED ? "default" : "outline"}
            className="shrink-0"
          >
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
                  <span className={compact ? "sr-only sm:not-sr-only" : ""}>{tSave("retry")}</span>
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
            disabled={status === OFFER_STATUS.ACCEPTED}
          >
            <Plus size={16} aria-hidden="true" />
            <span className={compact ? "sr-only md:not-sr-only" : ""}>{t("addProduct")}</span>
          </Button>
          {status === OFFER_STATUS.ACCEPTED ? (
            <Button
              className={compact ? "sm:w-auto" : "w-full sm:w-auto"}
              size="sm"
              variant="secondary"
              onClick={onReopen}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span className={compact ? "sr-only md:not-sr-only" : ""}>{t("backToDraft")}</span>
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
                  {validateState === "loading"
                    ? tReview("validation.checking")
                    : tReview("validation.checkWithAI")}
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
                      setEditOpen(true);
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

              <EditOfferDetailsDialog
                offerId={offerId}
                open={editOpen}
                onOpenChange={setEditOpen}
                initialName={formName}
                initialCustomer={{ id: formCustomerId, name: formCustomerName }}
                onSaved={onUpdate}
              />

              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tList("actions.deleteOfferConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {tList("actions.deleteOfferConfirmDescription", { name: offerTitle })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      {tList("actions.deleteCancel")}
                    </AlertDialogCancel>
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
