"use client";

import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {registerPaymentAction} from "@/modules/finance/finance.actions";
import {monthName} from "./month-row";

const METHODS = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal"] as const;

export function PayButton({
  ownerId,
  unitId,
  unitNumber,
  entrance,
  floor,
  monthlyFee,
  tariff,
  year,
  month,
  alreadyPaid,
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
  alreadyPaid: number;
}) {
  const t = useTranslations("owners");
  const tp = useTranslations("payments");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [pending, setPending] = useState(false);

  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) <= 0) {
      toast.error(tp("enterAmount"));
      return;
    }
    setPending(true);
    try {
      await registerPaymentAction({
        ownerId, unitId, amount, periodYear: year, periodMonth: month,
        paymentMethod: method as "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
        referenceNo: referenceNo || undefined,
        tariffPerSqm: tariff.toFixed(2),
      });
      setOpen(false);
      toast.success(tp("paidSuccess"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setAmount(owed.toFixed(2)); setOpen(true); }}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {t("pay")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tp("payTitle", {unit: unitNumber})}</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-zinc-400">
            {monthName(locale, year, month)} {year} · {t("blockFloor", {entrance, floor})}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">{tp("amountDue")}</span>
                <span className="font-medium">{monthlyFee.toFixed(2)} ₼</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{t("paidThisMonth")}</span>
                  <span className="text-green-600">{alreadyPaid.toFixed(2)} ₼</span>
                </div>
              )}
              {owed > 0 && (
                <div className="flex justify-between border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
                  <span className="text-sm font-medium text-red-600">{tp("toPay")}</span>
                  <span className="font-bold text-red-600">{owed.toFixed(2)} ₼</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{tp("amountLabel")}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("paymentMethod")}</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                      method === m
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {t(`paymentMethods.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{tp("referenceOptional")}</label>
              <input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={tp("referencePlaceholder")}
                className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">{tc("cancel")}</Button>
              <Button type="submit" disabled={pending} className="flex-[2] bg-green-600 hover:bg-green-700">
                {pending ? tp("processing") : tp("payAmount", {amount: Number(amount || 0).toFixed(2)})}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
