"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {editPaymentAction, deletePaymentAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHS = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

const METHODS: Record<string, string> = {
  cash: "Наличные",
  bank_transfer: "Банк. перевод",
  card: "Карта",
  e_manat: "E-Manat",
  pos_terminal: "POS-терминал",
  other: "Другое",
};

const EDIT_METHODS = [
  { value: "cash", label: "Наличные" },
  { value: "bank_transfer", label: "Банк. перевод" },
  { value: "card", label: "Карта" },
  { value: "e_manat", label: "E-Manat" },
  { value: "pos_terminal", label: "POS-терминал" },
];

export type PaymentRecord = {
  id: string;
  amount: string;
  tariffPerSqm: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: string;
  referenceNo: string | null;
  notes: string | null;
  paymentDate: Date;
  unitNumber: string;
  entrance: number;
  floor: number;
};

export function PaymentHistory({
  slug,
  ownerId,
  payments,
  canEdit,
}: {
  slug: string;
  ownerId: string;
  payments: PaymentRecord[];
  canEdit: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
  const [method, setMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [tariff, setTariff] = useState("0.40");
  const [notes, setNotes] = useState("");

  function openEdit(p: PaymentRecord) {
    setEditId(p.id);
    setAmount(p.amount);
    setYear(p.periodYear);
    setMonth(p.periodMonth);
    setMethod(p.paymentMethod);
    setReferenceNo(p.referenceNo ?? "");
    setTariff(p.tariffPerSqm);
    setNotes(p.notes ?? "");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setPending(true);
    try {
      await editPaymentAction(slug, ownerId, editId, {
        amount, periodYear: year, periodMonth: month,
        paymentMethod: method, referenceNo: referenceNo || undefined,
        tariffPerSqm: tariff, notes: notes || undefined,
      });
      setEditId(null);
      toast.success("Платёж обновлён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(paymentId: string) {
    setPending(true);
    try {
      await deletePaymentAction(slug, ownerId, paymentId);
      toast.success("Платёж удалён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex size-9 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{Number(p.amount).toFixed(2)} ₼</span>
                <span className="text-sm text-zinc-400">· {MONTHS[p.periodMonth - 1]} {p.periodYear}</span>
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {new Date(p.paymentDate).toLocaleDateString("ru-RU")}
                <span className="mx-1">·</span>
                Кв. {p.unitNumber}
                <span className="mx-1">·</span>
                {METHODS[p.paymentMethod] ?? p.paymentMethod}
                {p.referenceNo && (<><span className="mx-1">·</span>#{p.referenceNo}</>)}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(p)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-500 dark:hover:bg-zinc-800 text-sm">Изменить</button>
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <button className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800 text-sm">Удалить</button>
                  } />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить платёж?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Платёж {Number(p.amount).toFixed(2)} ₼ за {MONTHS[p.periodMonth - 1]} {p.periodYear} будет удалён безвозвратно.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={pending}
                        onClick={() => handleDelete(p.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {pending ? "Удаление..." : "Удалить"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={editId !== null} onOpenChange={(v) => { if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить платёж</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Месяц</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Год</label>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Сумма (₼)</label>
                <input type="number" step="0.01" min="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)} required
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Тариф (₼/м²)</label>
                <input type="number" step="0.01" min="0" value={tariff}
                  onChange={(e) => setTariff(e.target.value)} required
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Способ оплаты</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {EDIT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Референс №</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Чек / транзакция №"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditId(null)} className="flex-1">Отмена</Button>
              <Button type="submit" disabled={pending} className="flex-[2]">
                {pending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
