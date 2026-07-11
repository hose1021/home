"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {payForUnitAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {IconAlertCircle, IconCheck} from "@tabler/icons-react";

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
        ownerId, unitId, amount, year, month,
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
      <div className="flex items-center px-5 py-3 transition-colors hover:bg-muted/25 sm:px-6">
        <span className={`mr-3 flex size-7 shrink-0 items-center justify-center rounded-lg ${
          isPaid
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        }`}>
          {isPaid ? <IconCheck className="size-4" /> : <IconAlertCircle className="size-4" />}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm">{MONTHS[month - 1]}</span>
          {isPaid && payment && (
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              {Number(payment.tariffPerSqm).toFixed(2)} ₼/м² · {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
              {payment.referenceNo && ` · #${payment.referenceNo}`}
            </span>
          )}
        </div>

        <span className={`text-sm font-semibold tabular-nums ${isPaid ? "text-emerald-600" : "text-destructive"}`}>
          {isPaid ? `${alreadyPaid.toFixed(2)} ₼` : `${owed.toFixed(2)} ₼`}
        </span>

        <div className="ml-3 shrink-0">
          {!isPaid && (
            <Button
              onClick={() => { setAmount(owed.toFixed(2)); setMethod("cash"); setReferenceNo(""); setPayOpen(true); }}
              size="sm"
            >
              Оплатить
            </Button>
          )}
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оплата — кв. {unitNumber}</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">
            {MONTHS[month - 1]} {year} · Блок {entrance}, эт. {floor}
          </p>
          <form onSubmit={handlePay} className="space-y-5 mt-2">
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
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
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="h-11 text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Способ оплаты</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <Button key={m.value} type="button" size="sm" variant={method === m.value ? "default" : "outline"} onClick={() => setMethod(m.value)} className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs">
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Референс № <span className="text-zinc-400 font-normal">(необязательно)</span></label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Чек / транзакция №" className="h-11 text-base" />
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
