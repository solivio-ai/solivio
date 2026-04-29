"use client";

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

function formatValidationMessage(result: ValidationResult): string {
  const verdictLabel = { pass: "Kompletna", partial: "Częściowo spełniona", fail: "Wymagania niespełnione" }[result.verdict];
  const lines: string[] = [`**Wyniki walidacji AI**\n\n**Status:** ${verdictLabel}\n\n${result.summary}`];

  if (result.missingRequirements.length > 0) {
    lines.push(`\n**Brakujące wymagania:**\n${result.missingRequirements.map((r) => `• ${r}`).join("\n")}`);
  }

  if (result.issues.length > 0) {
    lines.push(`\n**Uwagi:**\n${result.issues.map((i) => `• ${i}`).join("\n")}`);
  }

  if (result.missingRequirements.length > 0) {
    lines.push("\nCzy możesz zaproponować rozwiązania dla brakujących pozycji lub skomentować te wyniki?");
  }

  return lines.join("");
}

const verdictConfig = {
  pass: {
    Icon: CheckCircle2,
    iconClass: "text-green-500",
    badgeVariant: "default" as const,
    label: "Oferta kompletna"
  },
  partial: {
    Icon: AlertTriangle,
    iconClass: "text-amber-500",
    badgeVariant: "secondary" as const,
    label: "Częściowo spełniona"
  },
  fail: {
    Icon: XCircle,
    iconClass: "text-destructive",
    badgeVariant: "destructive" as const,
    label: "Wymagania niespełnione"
  }
};

export function OfferValidationDialog({
  open,
  onOpenChange,
  result,
  onAccept,
  onSendToChat
}: OfferValidationDialogProps) {
  const config = verdictConfig[result.verdict];
  const { Icon } = config;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon size={20} aria-hidden="true" className={config.iconClass} />
            <DialogTitle>Wynik walidacji AI</DialogTitle>
          </div>
          <DialogDescription>{result.summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>

          {result.missingRequirements.length > 0 && (
            <section className="grid gap-1.5">
              <p className="text-sm font-medium text-destructive">Brakujące wymagania</p>
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
              <p className="text-sm font-medium text-amber-600">Uwagi</p>
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
              Wszystkie wymagania klienta są spełnione.
            </p>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:flex-nowrap sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
          {onSendToChat && (
            <Button
              variant="outline"
              onClick={() => {
                onSendToChat(formatValidationMessage(result));
                onOpenChange(false);
              }}
            >
              <MessageSquare size={16} aria-hidden="true" />
              Przekaż do czatu
            </Button>
          )}
          <Button
            onClick={() => {
              onOpenChange(false);
              onAccept();
            }}
          >
            <Send size={16} aria-hidden="true" />
            Zaakceptuj ofertę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
