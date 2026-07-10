"use client";

import {useState} from "react";
import {toast} from "sonner";
import {registerPaymentAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

type UnitOption = { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null; ownerId: string | null };

const METHODS = [
  { value: "cash", label: "Наличные" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "card", label: "Карта" },
  { value: "e_manat", label: "E-Manat" },
  { value: "pos_terminal", label: "POS-терминал" },
];

export function PaymentForm({
  slug,
  units,
  onDone,
}: {
  slug: string;
  units: UnitOption[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [method, setMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const selected = units.find((u) => u.id === unitId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) { toast.error("Выберите квартиру"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Укажите сумму"); return; }
    if (!selected?.ownerId) { toast.error("У квартиры нет собственника"); return; }

    setPending(true);
    try {
      await registerPaymentAction(slug, {
        unitId,
        ownerId: selected.ownerId,
        amount,
        periodYear: Number(year),
        periodMonth: Number(month),
        paymentMethod: method as "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      });
      toast.success("Платёж зарегистрирован");
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
        <Label>Квартира</Label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Выберите квартиру</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              Блок {u.entrance}, эт. {u.floor}, кв. {u.unitNumber}{u.ownerName ? ` — ${u.ownerName}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Сумма (₼)</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" />
        </div>
        <div>
          <Label>Способ оплаты</Label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
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
        <Label>Референс №</Label>
        <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Чек / транзакция №" className="mt-1" />
      </div>

      <div>
        <Label>Примечания</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Доп. информация" className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
        <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Зарегистрировать"}</Button>
      </div>
    </form>
  );
}

export function PaymentDialog({ slug, units, open, onOpenChange }: {
  slug: string;
  units: UnitOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Регистрация платежа</DialogTitle></DialogHeader>
        {units.length === 0 ? (
          <p className="text-sm text-zinc-400">Нет квартир с собственниками</p>
        ) : (
          <PaymentForm slug={slug} units={units} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
