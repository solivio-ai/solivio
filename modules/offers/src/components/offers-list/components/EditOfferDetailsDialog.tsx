"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Offer } from "@solivio/domain";
import { Button } from "@solivio/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@solivio/ui/components/dialog.tsx";
import { Input } from "@solivio/ui/components/input.tsx";
import { Label } from "@solivio/ui/components/label.tsx";

import type { CustomerSelection } from "../../../components/customers/index.ts";
import { CustomerCombobox } from "../../../components/customers/index.ts";

type Props = {
  offerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialCustomer: CustomerSelection;
  /** Called with the updated offer when the PATCH succeeds. */
  onSaved?: (offer: Offer) => void;
};

/**
 * Shared dialog for editing an offer's name and assigned customer. Used by both
 * the offers list row actions and the offer builder action bar so the customer
 * autocomplete behaviour stays identical in both places.
 */
export function EditOfferDetailsDialog({
  offerId,
  open,
  onOpenChange,
  initialName,
  initialCustomer,
  onSaved,
}: Props) {
  const t = useTranslations("offers.offersList");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [customer, setCustomer] = useState<CustomerSelection>(initialCustomer);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(initialName);
      setCustomer(initialCustomer);
    }
    onOpenChange(next);
  };

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          customerId: customer.id,
          customerName: customer.name.trim() ? customer.name.trim() : null,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (payload?.offer) onSaved?.(payload.offer as Offer);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("actions.editDetailsTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor={`offer-edit-name-${offerId}`}>{t("actions.fieldName")}</Label>
            <Input
              id={`offer-edit-name-${offerId}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`offer-edit-customer-${offerId}`}>
              {t("actions.fieldCustomerName")}
            </Label>
            <CustomerCombobox
              id={`offer-edit-customer-${offerId}`}
              value={customer}
              onChange={setCustomer}
              placeholder={t("actions.fieldCustomerName")}
              disabled={saving}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.deleteCancel")}
          </Button>
          <Button type="button" disabled={saving || !name.trim()} onClick={() => void handleSave()}>
            {t("actions.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
