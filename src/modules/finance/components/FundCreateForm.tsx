"use client";

import {useState} from "react";
import {toast} from "sonner";
import {createFundAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {useTranslations} from "next-intl";

const FUND_TYPE_KEYS = ["reserve", "repair", "improvement", "emergency", "other"] as const;
type FundTypeKey = (typeof FUND_TYPE_KEYS)[number];

export function FundCreateForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<FundTypeKey>("reserve");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error(t("funds.name")); return; }
    setPending(true);
    try {
      await createFundAction({
        name: name.trim(),
        type,
        targetAmount: targetAmount || undefined,
        description: description || undefined,
      });
      toast.success(t("funds.create"));
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
        <Label>{t("funds.name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("funds.name")} className="mt-1" />
      </div>

      <div>
        <Label>{t("funds.type")}</Label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as FundTypeKey)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {FUND_TYPE_KEYS.map((k) => <option key={k} value={k}>{t(`funds.types.${k}` as Parameters<typeof t>[0])}</option>)}
        </select>
      </div>

      <div>
        <Label>{t("funds.targetAmount")} ({tc("currency")})</Label>
        <Input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" />
      </div>

      <div>
        <Label>{tc("description")}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("funds.creating") : t("funds.create")}</Button>
      </div>
    </form>
  );
}

export function FundCreateDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("funds.create")}</DialogTitle></DialogHeader>
        <FundCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
