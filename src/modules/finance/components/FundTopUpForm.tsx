"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {topUpFundAction} from "@/modules/finance/finance.actions";

export function FundTopUpForm({ fundId, onDone }: { fundId: string; onDone: () => void }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { toast.error(t("funds.topUpInvalid")); return; }
    setPending(true);
    try {
      await topUpFundAction({ fundId, amount });
      toast.success(t("funds.topUpSuccess"));
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t("funds.topUpAmount")} ({tc("currency")})</Label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0.01" placeholder="0.00" className="mt-1" autoFocus />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("funds.topUpPending") : t("funds.topUp")}</Button>
      </div>
    </form>
  );
}

export function FundTopUpDialog({ fundId, open, onOpenChange }: {
  fundId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("funds.topUpTitle")}</DialogTitle></DialogHeader>
        {fundId && <FundTopUpForm fundId={fundId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
