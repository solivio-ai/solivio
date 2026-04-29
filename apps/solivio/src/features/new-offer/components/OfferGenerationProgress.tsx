"use client";

import { Check, Circle, FileSearch, ListChecks, PackageSearch, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type OfferGenerationProgressProps = {
  clientRequest: string;
  customerName: string;
  elapsedMs: number;
  state: "running" | "complete";
};

const generationSteps = [
  {
    key: "readingRequest",
    icon: FileSearch,
  },
  {
    key: "extractingNeeds",
    icon: ListChecks,
  },
  {
    key: "preparingSearches",
    icon: Search,
  },
  {
    key: "searchingCatalog",
    icon: PackageSearch,
  },
  {
    key: "checkingGaps",
    icon: ListChecks,
  },
  {
    key: "composingDraft",
    icon: Sparkles,
  },
] as const;

const stepStartsMs = [0, 1600, 4200, 7200, 10400, 13600] as const;
const stepProgress = [12, 28, 44, 62, 78, 92] as const;

function getActiveStepIndex(elapsedMs: number, state: OfferGenerationProgressProps["state"]) {
  if (state === "complete") {
    return generationSteps.length - 1;
  }

  let activeIndex = 0;
  for (let index = 0; index < stepStartsMs.length; index += 1) {
    if (elapsedMs >= stepStartsMs[index]) {
      activeIndex = index;
    }
  }

  return activeIndex;
}

function getEstimatedProgress(elapsedMs: number, state: OfferGenerationProgressProps["state"]) {
  if (state === "complete") {
    return 100;
  }

  const activeIndex = getActiveStepIndex(elapsedMs, state);
  const startMs = stepStartsMs[activeIndex];
  const endMs = stepStartsMs[activeIndex + 1] ?? 32000;
  const startProgress = activeIndex === 0 ? 5 : stepProgress[activeIndex - 1];
  const endProgress = stepProgress[activeIndex];
  const ratio = Math.min(1, Math.max(0, (elapsedMs - startMs) / (endMs - startMs)));

  return Math.min(94, Math.round(startProgress + (endProgress - startProgress) * ratio));
}

function getRequestPreview(clientRequest: string) {
  const normalized = clientRequest.trim().replace(/\s+/g, " ");
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

export function OfferGenerationProgress({
  clientRequest,
  customerName,
  elapsedMs,
  state,
}: OfferGenerationProgressProps) {
  const t = useTranslations("NewOffer.generation");
  const activeStepIndex = getActiveStepIndex(elapsedMs, state);
  const progress = getEstimatedProgress(elapsedMs, state);
  const activeStep = generationSteps[activeStepIndex];
  const activeStepTitle = t(`steps.${activeStep.key}.title`);
  const activeStepDescription = t(`steps.${activeStep.key}.description`);
  const requestPreview = getRequestPreview(clientRequest);

  return (
    <section
      aria-busy={state === "running"}
      aria-labelledby="offer-generation-progress-title"
      className="grid gap-4"
    >
      <div className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <Sparkles size={18} aria-hidden="true" className="text-primary" />
              <h2
                id="offer-generation-progress-title"
                className="font-heading text-lg font-medium leading-snug"
              >
                {t("title")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {t("activeStep", {
                title: activeStepTitle,
                description: activeStepDescription,
              })}
            </p>
          </div>
          <Badge variant={state === "complete" ? "default" : "secondary"}>
            {state === "complete"
              ? t("draftReady")
              : t("elapsed", { seconds: Math.max(1, Math.round(elapsedMs / 1000)) })}
          </Badge>
        </div>

        <div className="grid gap-2">
          <Progress value={progress} aria-label={t("progressLabel")} />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {t("stepCounter", {
                current: activeStepIndex + 1,
                total: generationSteps.length,
              })}
            </span>
            <span>{t("progressValue", { progress })}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]">
        <ol className="grid gap-2 rounded-lg border bg-background/40 p-3">
          {generationSteps.map((step, index) => {
            const isComplete = state === "complete" || index < activeStepIndex;
            const isActive = state === "running" && index === activeStepIndex;
            const StepIcon = step.icon;
            const stepTitle = t(`steps.${step.key}.title`);

            return (
              <li key={step.key} className="grid grid-cols-[auto_1fr] gap-3">
                <span
                  className={[
                    "mt-0.5 flex size-7 items-center justify-center rounded-full border",
                    isComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  {isComplete ? (
                    <Check size={14} aria-hidden="true" />
                  ) : isActive ? (
                    <StepIcon size={14} aria-hidden="true" className="animate-pulse" />
                  ) : (
                    <Circle size={10} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-6">{stepTitle}</p>
                    <Badge variant="outline">{t(`steps.${step.key}.detail`)}</Badge>
                  </div>
                  {isActive ? (
                    <p className="text-sm text-muted-foreground">
                      {t(`steps.${step.key}.description`)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-3">
          <div className="grid gap-3 rounded-lg border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t("requestSnapshot")}</p>
              <Badge variant="outline">{customerName.trim() || t("unnamedCustomer")}</Badge>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{requestPreview}</p>
          </div>

          <div className="grid gap-3 rounded-lg border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <PackageSearch size={16} aria-hidden="true" className="text-primary" />
              <p className="text-sm font-medium">{t("catalogPreview")}</p>
            </div>
            <div className="grid gap-2">
              <div className="grid h-12 grid-cols-[1fr_64px] items-center gap-3 rounded-md border bg-card/60 px-3">
                <div className="grid gap-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid h-12 grid-cols-[1fr_64px] items-center gap-3 rounded-md border bg-card/60 px-3">
                <div className="grid gap-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid h-12 grid-cols-[1fr_64px] items-center gap-3 rounded-md border bg-card/60 px-3">
                <div className="grid gap-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-3/5" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
