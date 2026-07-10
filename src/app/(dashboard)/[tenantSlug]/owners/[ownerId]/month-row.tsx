"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {payForUnitAction} from "./pay-action";
import {Button} from "@/components/ui/button";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const METHODS = [
  { value: "cash", label: "Наличные" },
  { value: "bank_transfer", label: "Банк. перевод" },
  { value: "card", label: "Карта" },
  { value: "e_manat", label: "E-Manat" },
  { value: "pos_terminal", label: "POS-терминал" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Наличные",
  bank_transfer: "Банк. перевод",
  card: "Карта",
  e_manat: "E-Manat",
  pos_terminal: "POS-терминал",
  other: "Другое",
};

export type MonthPayment = {
  id: string;
  amount: string;
  tariffPerSqm: string;
  paymentMethod: string;
  referenceNo: string | null;
};

export function MonthRow({
  slug,
  ownerId,
  unitId,
  unitNumber,
  entrance,
  floor,
  monthlyFee,
  tariff,
  year,
  month,
  isPaid,
  alreadyPaid,
  payment,
}: {
  slug: string;
  ownerId: string;
  unitId: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  monthlyFee: number;
  tariff: number;
  year: number;
  month: number;
  isPaid: boolean;
  alreadyPaid: number;
  payment: MonthPayment | null;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");

  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) <= 0) { toast.error("Введите сумму"); return; }
    setPending(true);
    try {
      await payForUnitAction(
        slug, ownerId, unitId, amount, year, month,
        method as "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
        referenceNo || undefined,
        tariff.toFixed(2),
      );
      setPayOpen(false);
      toast.success("Платёж проведён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center px-5 py-2.5">
        <span className={`mr-3 flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
          isPaid
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        }`}>
          {isPaid ? "✓" : "!"}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm">{MONTHS[month - 1]}</span>
          {isPaid && payment && (
            <span className="ml-2 text-xs text-zinc-400">
              {Number(payment.tariffPerSqm).toFixed(2)} ₼/м² · {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
              {payment.referenceNo && ` · #${payment.referenceNo}`}
            </span>
          )}
        </div>

        <span className={`text-sm font-medium ${isPaid ? "text-green-600" : "text-red-600"}`}>
          {isPaid ? `${alreadyPaid.toFixed(2)} ₼` : `${owed.toFixed(2)} ₼`}
        </span>

        <div className="ml-3 shrink-0">
          {!isPaid && (
            <button
              onClick={() => { setAmount(owed.toFixed(2)); setMethod("cash"); setReferenceNo(""); setPayOpen(true); }}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Оплатить
            </button>
          )}
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оплата — кв. {unitNumber}</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-zinc-400">
            {MONTHS[month - 1]} {year} · Блок {entrance}, эт. {floor}
          </p>
          <form onSubmit={handlePay} className="space-y-5 mt-2">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Начислено</span>
                <span className="font-medium">{monthlyFee.toFixed(2)} ₼</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Уже оплачено</span>
                  <span className="text-green-600">{alreadyPaid.toFixed(2)} ₼</span>
                </div>
              )}
              {owed > 0 && (
                <div className="flex justify-between border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
                  <span className="text-sm font-medium text-red-600">К оплате</span>
                  <span className="font-bold text-red-600">{owed.toFixed(2)} ₼</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Сумма (₼)</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Способ оплаты</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                      method === m.value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Референс № <span className="text-zinc-400 font-normal">(необязательно)</span></label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Чек / транзакция №"
                className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)} className="flex-1">Отмена</Button>
              <Button type="submit" disabled={pending} className="flex-[2] bg-green-600 hover:bg-green-700">
                {pending ? "Обработка..." : `Оплатить ${Number(amount || 0).toFixed(2)} ₼`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
