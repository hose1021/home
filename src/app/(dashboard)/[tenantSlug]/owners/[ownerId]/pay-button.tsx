"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {toast} from "sonner";
import {payForUnitAction} from "./pay-action";
import {Button} from "@/components/ui/button";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Окторябрь", "Ноябрь", "Декабрь",
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

export function PayButton({
  slug,
  ownerId,
  unitId,
  unitNumber,
  monthlyFee,
  debts,
}: {
  slug: string;
  ownerId: string;
  unitId: string;
  unitNumber: string;
  monthlyFee: number;
  debts: { year: number; month: number; paid: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  const debtForPeriod = debts.find((d) => d.year === year && d.month === month);
  const alreadyPaid = debtForPeriod?.paid ?? 0;
  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await payForUnitAction(slug, ownerId, unitId, amount, year, month);
      setOpen(false);
      toast("Платёж проведён");
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => { setAmount(owed.toFixed(2)); setOpen(true); }} className="w-full">Оплатить</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Оплата — квартира №{unitNumber}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Год</label>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Месяц</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <div className="flex justify-between"><span className="text-zinc-500">Тариф:</span><span>{monthlyFee.toFixed(2)} ₼</span></div>
              <div className="flex justify-between text-zinc-500"><span>Оплачено за период:</span><span className="text-green-600 font-medium">{alreadyPaid.toFixed(2)} ₼</span></div>
              {owed > 0 && <div className="flex justify-between font-medium text-red-600"><span>К оплате:</span><span>{owed.toFixed(2)} ₼</span></div>}
            </div>

            <div>
              <label className="block text-sm font-medium">Сумма (₼)</label>
              <input type="number" step="0.01" min="0.01" max={owed || 0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Отмена</button>
              <button type="submit" disabled={pending || owed <= 0} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {pending ? "Обработка..." : `Оплатить ${Number(amount || 0).toFixed(2)} ₼`}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
