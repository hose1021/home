"use client";

import {useState} from "react";
import {toast} from "sonner";
import {generateChargesAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {useTranslations} from "next-intl";

type Template = { id: string; name: string; amount: string };

export function ChargeGenerateForm({
  templates,
  onDone,
}: {
  templates: Template[];
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) {
      toast.error(t("charges.selectTemplate"));
      return;
    }
    if (!dueDate) {
      toast.error(t("charges.dueDate"));
      return;
    }
    setPending(true);
    try {
      const res = await generateChargesAction({
        templateId,
        periodYear: Number(year),
        periodMonth: Number(month),
        dueDate,
      });
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
      <div>
        <Label>{t("charges.template")}</Label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.name} ({Number(tmpl.amount).toFixed(2)} {tc("currency")})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tc("year")}</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={2024} max={2030} className="mt-1" />
        </div>
        <div>
          <Label>{tc("month")}</Label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>{t("charges.dueDate")}</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("charges.generating") : t("charges.generate")}</Button>
      </div>
    </form>
  );
}

export function ChargeGenerateDialog({ templates, open, onOpenChange }: {
  templates: Template[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("charges.generateTitle")}</DialogTitle></DialogHeader>
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("charges.noCharges")}</p>
        ) : (
          <ChargeGenerateForm templates={templates} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
