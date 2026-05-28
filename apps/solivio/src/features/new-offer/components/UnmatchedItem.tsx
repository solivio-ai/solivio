import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";

export function UnmatchedItem({
  item,
  modifyEnabled,
  onDelete,
  onManuallyMatch,
}: {
  item: string;
  modifyEnabled: boolean;
  onDelete: (item: string) => void;
  onManuallyMatch: (item: string) => void;
}) {
  const t = useTranslations("NewOffer.review.products");
  const handleDelete = () => {
    onDelete(item);
  };
  const handleManuallyMatch = () => {
    onManuallyMatch(item);
  };
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{item}</ItemTitle>
      </ItemContent>
      {modifyEnabled && (
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            aria-label={t("removeUnmatched")}
          >
            {t("removeUnmatched")}
          </Button>
          <Button size="sm" onClick={handleManuallyMatch} aria-label={t("manuallyMatchProduct")}>
            {t("manuallyMatchProduct")}
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}
