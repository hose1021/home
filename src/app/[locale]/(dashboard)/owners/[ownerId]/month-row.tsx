"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {toast} from "sonner";
import {payForUnitAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {IconAlertCircle, IconCheck} from "@tabler/icons-react";

const METHODS = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal"] as const;

export type MonthPayment = {
  id: string;
  amount: string;
  tariffPerSqm: string;
  paymentMethod: string;
  referenceNo: string | null;
};

export function monthName(locale: string, year: number, month: number, width: "long" | "short" = "long") {
  const name = new Intl.DateTimeFormat(locale, {month: width}).format(new Date(year, month - 1, 1));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function MonthRow({
  locale,
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
  locale: string;
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
  const t = useTranslations("owners");
  const tp = useTranslations("payments");
  const tc = useTranslations("common");
  const [payOpen, setPayOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("cash");
  const [referenceNo, setReferenceNo] = useState("");

  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) <= 0) { toast.error(tp("enterAmount")); return; }
    setPending(true);
    try {
      await payForUnitAction(
        ownerId, unitId, amount, year, month,
        method,
        referenceNo || undefined,
        tariff.toFixed(2),
      );
      setPayOpen(false);
      toast.success(tp("paidSuccess"));
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
          <span className="text-sm">{monthName(locale, year, month)}</span>
          {isPaid && payment && (
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              {Number(payment.tariffPerSqm).toFixed(2)} ₼/м² · {t(`paymentMethods.${payment.paymentMethod}`)}
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
              {t("pay")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tp("payTitle", {unit: unitNumber})}</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">
            {monthName(locale, year, month)} {year} · {t("blockFloor", {entrance, floor})}
          </p>
          <form onSubmit={handlePay} className="space-y-5 mt-2">
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
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
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="h-11 text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("paymentMethod")}</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <Button key={m} type="button" size="sm" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)} className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs">
                    {t(`paymentMethods.${m}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{tp("referenceOptional")}</label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder={tp("referencePlaceholder")} className="h-11 text-base" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)} className="flex-1">{tc("cancel")}</Button>
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
