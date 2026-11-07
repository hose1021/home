"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {BILLING} from "@/core/db/schema/enums";
import {generateChargesAction} from "@/modules/finance/finance.actions";

export function ChargeGenerateForm({onDone}: {onDone: () => void}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await generateChargesAction({periodYear: Number(year), periodMonth: Number(month)});
      toast.success(`${t("charges.generated")}: ${res.count}`);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const months = Array.from({length: 12}, (_, i) => ({
    value: String(i + 1),
    label: tc(`months.${i + 1}`),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("charges.generateHint")}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tc("year")}</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={BILLING.minYear} max={BILLING.maxYear} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="charge-month">{tc("month")}</Label>
          <Select value={month} onValueChange={(v) => setMonth(v ?? "")}>
            <SelectTrigger id="charge-month" className="mt-1">
              <SelectValue>{(v) => months.find((m) => m.value === v)?.label ?? ""}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("charges.generating") : t("charges.generate")}
      </Button>
    </form>
  );
}

export function ChargeGenerateDialog({open, onOpenChange}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title={t("charges.generateTitle")}>
      <ChargeGenerateForm onDone={() => onOpenChange(false)} />
    </DialogShell>
  );
}

function DialogShell({open, onOpenChange, title, children}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
