import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  BarChart3,
  Factory,
  Mail,
  Package,
  type LucideIcon,
  Users,
  DollarSign,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IntegrationConfig = {
  key: string;
  icon: LucideIcon;
  active: boolean;
  href?: string;
};

const INTEGRATIONS: IntegrationConfig[] = [
  { key: "productCatalog", icon: Package, active: true },
  { key: "erp", icon: Factory, active: false },
  { key: "crm", icon: Users, active: false },
  { key: "priceRules", icon: DollarSign, active: false },
  { key: "inventory", icon: BarChart3, active: false },
  { key: "emailDelivery", icon: Mail, active: false },
];

export async function IntegrationsSection() {
  const t = await getTranslations("Dashboard");

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold">{t("integrations.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("integrations.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map(({ key, icon: Icon, active, href }) => (
          <Card
            key={key}
            size="sm"
            className={cn(
              active &&
                "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
            )}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    active
                      ? "bg-green-100 dark:bg-green-900/40"
                      : "bg-muted"
                  )}
                >
                  <Icon
                    size={14}
                    aria-hidden="true"
                    className={
                      active
                        ? "text-green-700 dark:text-green-400"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <CardTitle>{t(`integrations.items.${key}.name`)}</CardTitle>
              </div>
              <CardDescription>
                {t(`integrations.items.${key}.description`)}
              </CardDescription>
            </CardHeader>

            <CardFooter className="justify-between">
              <Badge
                variant={active ? "outline" : "secondary"}
                className={cn(
                  active &&
                    "border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/40 dark:text-green-400"
                )}
              >
                {t(active ? "integrations.badge.active" : "integrations.badge.available")}
              </Badge>

              {active && href ? (
                <Link
                  href={href}
                  className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                >
                  {t("integrations.action.configure")}
                </Link>
              ) : ( !active &&
                <span className="text-xs text-muted-foreground">
                  {t("integrations.action.integrate")}
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
