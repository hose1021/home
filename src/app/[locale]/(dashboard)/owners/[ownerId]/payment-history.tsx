"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {deletePaymentAction, editPaymentAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {IconCheck, IconEdit, IconTrash} from "@tabler/icons-react";
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
import {monthName} from "./month-row";

const METHODS = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal"] as const;

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
  ownerId,
  payments,
  canEdit,
}: {
  ownerId: string;
  payments: PaymentRecord[];
  canEdit: boolean;
}) {
  const t = useTranslations("owners");
  const tp = useTranslations("payments");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
  const [method, setMethod] = useState<string>("cash");
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
      await editPaymentAction(ownerId, editId, {
        amount, periodYear: year, periodMonth: month,
        paymentMethod: method, referenceNo: referenceNo || undefined,
        tariffPerSqm: tariff, notes: notes || undefined,
      });
      setEditId(null);
      toast.success(tp("updated"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(paymentId: string) {
    setPending(true);
    try {
      await deletePaymentAction(ownerId, paymentId);
      toast.success(tp("deleted"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="surface-panel divide-y overflow-hidden">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/25 sm:px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
              <IconCheck className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{Number(p.amount).toFixed(2)} ₼</span>
                <span className="text-sm text-muted-foreground">· {monthName(locale, p.periodYear, p.periodMonth, "short")} {p.periodYear}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {new Date(p.paymentDate).toLocaleDateString(locale)}
                <span className="mx-1">·</span>
                {t("unitNumber", {unit: p.unitNumber})}
                <span className="mx-1">·</span>
                {t(`paymentMethods.${p.paymentMethod}`)}
                {p.referenceNo && (<><span className="mx-1">·</span>#{p.referenceNo}</>)}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} aria-label={tp("editAria")}><IconEdit /></Button>
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={tp("deleteAria")}><IconTrash /></Button>
                  } />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tp("deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {tp("deleteDescription", {amount: Number(p.amount).toFixed(2), period: `${monthName(locale, p.periodYear, p.periodMonth, "short")} ${p.periodYear}`})}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={pending}
                        onClick={() => handleDelete(p.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {pending ? tp("deleting") : tc("delete")}
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
            <DialogTitle>{tp("editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">{tp("month")}</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i + 1} value={i + 1}>{monthName(locale, year, i + 1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{tp("year")}</label>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">{tp("amountLabel")}</label>
                <input type="number" step="0.01" min="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)} required
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("tariffPerSqm")}</label>
                <input type="number" step="0.01" min="0" value={tariff}
                  onChange={(e) => setTariff(e.target.value)} required
                  className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("paymentMethod")}</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethods.${m}`)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("referenceNo")}</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={tp("referencePlaceholder")}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("notes")}</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditId(null)} className="flex-1">{tc("cancel")}</Button>
              <Button type="submit" disabled={pending} className="flex-[2]">
                {pending ? tp("saving") : tc("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
