"use client";

import {useState} from "react";
import {toast} from "sonner";
import {generateChargesAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

type Template = { id: string; name: string; amount: string };

export function ChargeGenerateForm({
  templates,
  onDone,
}: {
  templates: Template[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) {
      toast.error("Выберите шаблон");
      return;
    }
    if (!dueDate) {
      toast.error("Укажите срок оплаты");
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
      toast.success(`Создано начислений: ${res.count}`);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const months = [
    { value: "1", label: "Январь" }, { value: "2", label: "Февраль" },
    { value: "3", label: "Март" }, { value: "4", label: "Апрель" },
    { value: "5", label: "Май" }, { value: "6", label: "Июнь" },
    { value: "7", label: "Июль" }, { value: "8", label: "Август" },
    { value: "9", label: "Сентябрь" }, { value: "10", label: "Октябрь" },
    { value: "11", label: "Ноябрь" }, { value: "12", label: "Декабрь" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Шаблон начисления</Label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({Number(t.amount).toFixed(2)} ₼)</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Год</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={2024} max={2030} className="mt-1" />
        </div>
        <div>
          <Label>Месяц</Label>
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
        <Label>Срок оплаты</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
        <Button type="submit" disabled={pending}>{pending ? "Создание..." : "Сгенерировать"}</Button>
      </div>
    </form>
  );
}

export function ChargeGenerateDialog({ templates, open, onOpenChange }: {
  templates: Template[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Начисление по шаблону</DialogTitle></DialogHeader>
        {templates.length === 0 ? (
          <p className="text-sm text-zinc-400">Нет активных шаблонов начислений</p>
        ) : (
          <ChargeGenerateForm templates={templates} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
