"use client";

import {useState} from "react";
import {toast} from "sonner";
import {createFundAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

const FUND_TYPES = [
  { value: "operating", label: "Операционный" },
  { value: "reserve", label: "Резервный" },
  { value: "repair", label: "Ремонтный" },
  { value: "emergency", label: "Аварийный" },
  { value: "special", label: "Специальный" },
];

export function FundCreateForm({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("operating");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Введите название фонда"); return; }
    setPending(true);
    try {
      await createFundAction({
        name: name.trim(),
        type: type as "operating" | "reserve" | "repair" | "emergency" | "special",
        targetAmount: targetAmount || undefined,
        description: description || undefined,
      });
      toast.success("Фонд создан");
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
        <Label>Название</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Текущий ремонт" className="mt-1" />
      </div>

      <div>
        <Label>Тип фонда</Label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {FUND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <Label>Целевая сумма (₼)</Label>
        <Input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" />
      </div>

      <div>
        <Label>Описание</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
        <Button type="submit" disabled={pending}>{pending ? "Создание..." : "Создать фонд"}</Button>
      </div>
    </form>
  );
}

export function FundCreateDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый фонд</DialogTitle></DialogHeader>
        <FundCreateForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export { FUND_TYPES };
