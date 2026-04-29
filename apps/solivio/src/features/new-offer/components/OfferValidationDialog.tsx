"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, MessageSquare, XCircle, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export type ValidationResult = {
  verdict: "pass" | "partial" | "fail";
  summary: string;
  issues: string[];
  missingRequirements: string[];
};

type OfferValidationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ValidationResult;
  onAccept: () => void;
  onSendToChat?: (message: string) => void;
};

function formatValidationMessage(result: ValidationResult, t: (key: string) => string): string {
  const verdictLabel = t(`verdict.${result.verdict}`);
  const lines: string[] = [`${t("messageHeader")}\n\n**${t("statusLabel")}:** ${verdictLabel}\n\n${result.summary}`];

  if (result.missingRequirements.length > 0) {
    lines.push(`\n**${t("missingRequirements")}:**\n${result.missingRequirements.map((r) => `• ${r}`).join("\n")}`);
  }

  if (result.issues.length > 0) {
    lines.push(`\n**${t("notes")}:**\n${result.issues.map((i) => `• ${i}`).join("\n")}`);
  }

  if (result.missingRequirements.length > 0) {
    lines.push(`\n${t("chatPrompt")}`);
  }

  return lines.join("");
}

const getVerdictConfig = (t: (key: string) => string) => ({
  pass: {
    Icon: CheckCircle2,
    iconClass: "text-green-500",
    badgeVariant: "default" as const,
    label: t("verdict.pass")
  },
  partial: {
    Icon: AlertTriangle,
    iconClass: "text-amber-500",
    badgeVariant: "secondary" as const,
    label: t("verdict.partial")
  },
  fail: {
    Icon: XCircle,
    iconClass: "text-destructive",
    badgeVariant: "destructive" as const,
    label: t("verdict.fail")
  }
});

export function OfferValidationDialog({
  open,
  onOpenChange,
  result,
  onAccept,
  onSendToChat,
}: OfferValidationDialogProps) {
  const t = useTranslations("NewOffer.review.validation");
  const verdictConfig = getVerdictConfig(t);
  const config = verdictConfig[result.verdict];
  const { Icon } = config;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon size={20} aria-hidden="true" className={config.iconClass} />
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <DialogDescription>{result.summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("statusLabel")}:</span>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>

          {result.missingRequirements.length > 0 && (
            <section className="grid gap-1.5">
              <p className="text-sm font-medium text-destructive">{t("missingRequirements")}</p>
              <ul className="grid gap-1">
                {result.missingRequirements.map((req, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <XCircle size={14} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.issues.length > 0 && (
            <section className="grid gap-1.5">
              <p className="text-sm font-medium text-amber-600">{t("notes")}</p>
              <ul className="grid gap-1">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.verdict === "pass" && result.issues.length === 0 && result.missingRequirements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("allMet")}
            </p>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:flex-nowrap sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
          {onSendToChat && (
            <Button
              variant="outline"
              onClick={() => {
                onSendToChat(formatValidationMessage(result, t));
                onOpenChange(false);
              }}
            >
              <MessageSquare size={16} aria-hidden="true" />
              {t("transferToChat")}
            </Button>
          )}
          {result.verdict !== "fail" && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onAccept();
              }}
            >
              <Send size={16} aria-hidden="true" />
              {t("acceptOffer")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
