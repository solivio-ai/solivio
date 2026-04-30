"use client";

import {
  Check,
  Circle,
  FileSearch,
  ListChecks,
  PackageSearch,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Progress } from "@/components/ui/progress";

type OfferGenerationProgressProps = {
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

export function OfferGenerationProgress({ elapsedMs, state }: OfferGenerationProgressProps) {
  const t = useTranslations("NewOffer.generation");
  const activeStepIndex = getActiveStepIndex(elapsedMs, state);
  const progress = getEstimatedProgress(elapsedMs, state);
  const activeStep = generationSteps[activeStepIndex];
  const activeStepTitle = t(`steps.${activeStep.key}.title`);
  const activeStepDescription = t(`steps.${activeStep.key}.description`);

  return (
    <section
      aria-busy={state === "running"}
      aria-labelledby="offer-generation-progress-title"
      className="grid gap-5"
    >
      <div className="grid gap-4 rounded-lg border bg-card/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="offer-generation-progress-title"
                className="font-heading text-xl font-semibold leading-tight"
              >
                {t("title")}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-full bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 p-1">
            <Progress
              value={progress}
              aria-label={t("progressLabel")}
              className="h-3 bg-background/80 shadow-inner"
            />
          </div>
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
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          <span className="font-medium text-foreground">{activeStepTitle}</span>
          {": "}
          {activeStepDescription}
        </p>
      </div>

      <div>
        <ol className="grid gap-2 rounded-lg border bg-background/50 p-3">
          {generationSteps.map((step, index) => {
            const isStepComplete = state === "complete" || index < activeStepIndex;
            const isActive = state === "running" && index === activeStepIndex;
            const StepIcon = step.icon;
            const stepTitle = t(`steps.${step.key}.title`);

            return (
              <li key={step.key} className="grid grid-cols-[auto_1fr] gap-3">
                <span
                  className={[
                    "mt-0.5 flex size-7 items-center justify-center rounded-full border",
                    isStepComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  {isStepComplete ? (
                    <Check size={14} aria-hidden="true" />
                  ) : isActive ? (
                    <StepIcon size={14} aria-hidden="true" className="animate-pulse" />
                  ) : (
                    <Circle size={10} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-medium leading-6">{stepTitle}</p>
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

      </div>
    </section>
  );
}
