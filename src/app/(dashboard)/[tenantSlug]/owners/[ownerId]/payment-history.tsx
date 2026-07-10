"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {editPaymentAction, deletePaymentAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
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

  const editing = payments.find((p) => p.id === editId);
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

  if (payments.length === 0) return null;

  return (
    <>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-3 py-2 text-left font-medium">Дата</th>
              <th className="px-3 py-2 text-left font-medium">Квартира</th>
              <th className="px-3 py-2 text-left font-medium">Период</th>
              <th className="px-3 py-2 text-right font-medium">Сумма</th>
              <th className="px-3 py-2 text-right font-medium">Тариф ₼/м²</th>
              <th className="px-3 py-2 text-left font-medium">Способ</th>
              <th className="px-3 py-2 text-left font-medium">Референс</th>
              {canEdit && <th className="px-3 py-2 text-right font-medium">Действия</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                  {new Date(p.paymentDate).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  Кв. {p.unitNumber}
                  <span className="ml-1 text-zinc-400 text-xs">Б{p.entrance} э{p.floor}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{MONTHS[p.periodMonth - 1]} {p.periodYear}</td>
                <td className="px-3 py-2 text-right font-medium text-green-600">{Number(p.amount).toFixed(2)} ₼</td>
                <td className="px-3 py-2 text-right text-zinc-500">{Number(p.tariffPerSqm).toFixed(2)}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {METHODS.find((m) => m.value === p.paymentMethod)?.label ?? p.paymentMethod}
                </td>
                <td className="px-3 py-2 text-zinc-400 text-xs">{p.referenceNo ?? "—"}</td>
                {canEdit && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-600 text-xs mr-2">Изменить</button>
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <button className="text-red-500 hover:text-red-600 text-xs">Удалить</button>
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
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editId !== null} onOpenChange={(v) => { if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование платежа</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Год</Label>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                    {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Месяц</Label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                    {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Сумма (₼)</Label>
                  <Input type="number" step="0.01" min="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label>Тариф (₼/м²)</Label>
                  <Input type="number" step="0.01" min="0" value={tariff}
                    onChange={(e) => setTariff(e.target.value)} required className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Способ оплаты</Label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <Label>Референс №</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Чек / транзакция №" className="mt-1" />
              </div>

              <div>
                <Label>Примечания</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Комментарий" className="mt-1" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>Отмена</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
