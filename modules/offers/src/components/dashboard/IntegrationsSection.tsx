import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  DollarSign,
  Factory,
  FileText,
  Gauge,
  History,
  Package,
  Star,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@solivio/ui/components/badge.tsx";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@solivio/ui/components/card.tsx";
import { cn } from "@solivio/ui/lib/utils.ts";

type IntegrationConfig = {
  key: string;
  icon: LucideIcon;
  active: boolean;
};

const INTEGRATIONS: IntegrationConfig[] = [
  { key: "productCatalog", icon: Package, active: true },
  { key: "historicalOrders", icon: History, active: true },
  { key: "documentation", icon: FileText, active: true },
  { key: "industryKnowledge", icon: BookOpen, active: true },
  { key: "rfqBenchmarks", icon: Gauge, active: false },
  { key: "priceRules", icon: DollarSign, active: false },
  { key: "crm", icon: Users, active: false },
  { key: "erp", icon: Factory, active: false },
  { key: "inventory", icon: BarChart3, active: false },
  { key: "productReviews", icon: Star, active: false },
];

export async function IntegrationsSection() {
  const t = await getTranslations("offers.dashboard");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t("integrations.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("integrations.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map(({ key, icon: Icon, active }) => (
          <Card
            key={key}
            size="sm"
            className={cn(
              "h-full gap-0 py-0 shadow-sm transition-colors",
              active
                ? "bg-primary/5 ring-primary/30"
                : "bg-muted/45 text-muted-foreground grayscale ring-border/70 hover:bg-muted/55",
            )}
          >
            <CardHeader className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    active
                      ? "border-primary/35 bg-primary/15 text-secondary dark:text-primary"
                      : "border-border/70 bg-background/50 text-muted-foreground/75",
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle
                    className={cn("text-sm leading-5", !active && "text-muted-foreground")}
                  >
                    {t(`integrations.items.${key}.name`)}
                  </CardTitle>
                  <CardDescription
                    className={cn(
                      "mt-1 line-clamp-3 leading-5",
                      !active && "text-muted-foreground/75",
                    )}
                  >
                    {t(`integrations.items.${key}.description`)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardFooter
              className={cn(
                "mt-auto gap-3 px-4 py-3",
                active ? "justify-start bg-muted/35" : "justify-between bg-muted/65",
              )}
            >
              {active ? (
                <Badge
                  variant="outline"
                  className="border-primary/45 bg-primary/15 text-foreground"
                >
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {t("integrations.badge.active")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-border/70 bg-background/50 text-muted-foreground"
                >
                  {t("integrations.badge.available")}
                </Badge>
              )}

              {!active && (
                <span className="inline-flex h-6 items-center gap-1 text-xs font-medium text-muted-foreground/80">
                  {t("integrations.action.integrate")}
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
