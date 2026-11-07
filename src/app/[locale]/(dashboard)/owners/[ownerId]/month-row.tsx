"use client";

import {IconAlertCircle, IconCheck} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {PAYMENT_METHODS, type PaymentMethod} from "@/core/db/schema/enums";
import {registerPaymentAction} from "@/modules/finance/finance.actions";
import {formatAmount, formatNumber} from "@/modules/finance/money-format";

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
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [referenceNo, setReferenceNo] = useState("");

  const owed = Math.max(0, monthlyFee - alreadyPaid);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (Number(amount) <= 0) { toast.error(tp("enterAmount")); return; }
    setPending(true);
    try {
      await registerPaymentAction({
        ownerId, unitId, amount, periodYear: year, periodMonth: month,
        paymentMethod: method,
        referenceNo: referenceNo || undefined,
        tariffPerSqm: String(tariff),
      });
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
        <span className={`mr-3 flex size-7 shrink-0 items-center justify-center rounded-[4px] ${
          isPaid
            ? "bg-success/12 border-success/35 text-success"
            : "bg-danger/12 border-danger/35 text-danger"
        }`}>
          {isPaid ? <IconCheck className="size-4" /> : <IconAlertCircle className="size-4" />}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm">{monthName(locale, year, month)}</span>
          {isPaid && payment && (
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              {formatAmount(payment.tariffPerSqm)}/{tc("squareMeters")} · {t(`paymentMethods.${payment.paymentMethod}`)}
              {payment.referenceNo && ` · #${payment.referenceNo}`}
            </span>
          )}
        </div>

        <span className={`text-sm font-semibold tabular-nums ${isPaid ? "text-success" : "text-destructive"}`}>
          {isPaid ? formatAmount(alreadyPaid) : formatAmount(owed)}
        </span>

        <div className="ml-3 shrink-0">
          {!isPaid && (
            <Button
              onClick={() => { setAmount(String(owed)); setMethod("cash"); setReferenceNo(""); setPayOpen(true); }}
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
            <div className="space-y-1.5 rounded-[4px] border bg-muted/30 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tp("amountDue")}</span>
                <span className="font-medium">{formatAmount(monthlyFee)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70">{t("paidThisMonth")}</span>
                  <span className="text-success">{formatAmount(alreadyPaid)}</span>
                </div>
              )}
              {owed > 0 && (
                <div className="flex justify-between border-t border-border pt-1.5 dark:border-border">
                  <span className="text-sm font-medium text-danger">{tp("toPay")}</span>
                  <span className="font-bold text-danger">{formatAmount(owed)}</span>
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
                {PAYMENT_METHODS.map((m) => (
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
              <Button type="submit" disabled={pending} className="flex-[2] ">
                {pending ? tp("processing") : tp("payAmount", {amount: formatNumber(amount || 0)})}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
