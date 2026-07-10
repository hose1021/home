"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {payForUnitAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const METHODS = [
  { value: "cash", label: "Наличные" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "card", label: "Карта" },
  { value: "e_manat", label: "E-Manat" },
  { value: "pos_terminal", label: "POS-терминал" },
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

export function PayButton({
  slug,
  ownerId,
  unitId,
  unitNumber,
  entrance,
  floor,
  monthlyFee,
  tariff,
  periods,
}: {
  slug: string;
  ownerId: string;
  unitId: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  monthlyFee: number;
  tariff: number;
  periods: { year: number; month: number; charged: number; paid: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [pending, setPending] = useState(false);

  const periodData = periods.find((p) => p.year === year && p.month === month);
  const alreadyPaid = periodData?.paid ?? 0;
  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) <= 0) {
      toast.error("Введите сумму");
      return;
    }
    setPending(true);
    try {
      await payForUnitAction(
        slug, ownerId, unitId, amount, year, month,
        method as "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
        referenceNo || undefined,
        tariff.toFixed(2),
      );
      setOpen(false);
      toast.success("Платёж проведён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => { setAmount(owed > 0 ? owed.toFixed(2) : ""); setOpen(true); }}
        size="sm"
        variant={owed > 0 ? "default" : "outline"}
      >
        {owed > 0 ? `Оплатить ${owed.toFixed(2)} ₼` : "Внести платёж"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оплата — кв. {unitNumber} (Блок {entrance}, эт. {floor})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Год</Label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Месяц</Label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Начислено:</span>
                <span>{monthlyFee.toFixed(2)} ₼</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Оплачено:</span>
                <span className="text-green-600 font-medium">{alreadyPaid.toFixed(2)} ₼</span>
              </div>
              {owed > 0 && (
                <div className="flex justify-between font-medium text-red-600 border-t border-zinc-200 dark:border-zinc-700 pt-1">
                  <span>Долг:</span>
                  <span>{owed.toFixed(2)} ₼</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Сумма (₼)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Способ оплаты</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Референс №</Label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Чек / транзакция №"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending} className="bg-green-600 hover:bg-green-700">
                {pending ? "Обработка..." : `Оплатить ${Number(amount || 0).toFixed(2)} ₼`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
