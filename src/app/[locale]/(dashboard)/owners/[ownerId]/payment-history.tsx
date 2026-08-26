"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {toast} from "sonner";
import {refundPaymentAction} from "./pay-action";
import {Button} from "@/components/ui/button";
import {IconCheck, IconCash} from "@tabler/icons-react";
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

export type PaymentRecord = {
  id: string;
  amount: string;
  tariffPerSqm: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: string;
  status: string;
  referenceNo: string | null;
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
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRefund(paymentId: string) {
    setPendingId(paymentId);
    try {
      await refundPaymentAction(ownerId, paymentId);
      toast.success(tp("refunded"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="surface-panel divide-y overflow-hidden">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/25 sm:px-5">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
            p.status === "refunded"
              ? "bg-muted text-muted-foreground"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          }`}>
            <IconCheck className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold amount">{Number(p.amount).toFixed(2)} ₼</p>
            <div className="truncate text-xs text-muted-foreground">
              {new Date(p.paymentDate).toLocaleDateString(locale)}
              <span className="mx-1">·</span>
              {t("unitNumber", {unit: p.unitNumber})}
              <span className="mx-1">·</span>
              {t(`paymentMethods.${p.paymentMethod}`)}
              {p.status === "refunded" && (<><span className="mx-1">·</span>{tp("refundedStatus")}</>)}
            </div>
          </div>
          {canEdit && p.status === "confirmed" && (
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="ghost" size="icon-sm" aria-label={tp("refundAria")}><IconCash /></Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tp("refundTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tp("refundDescription", {amount: Number(p.amount).toFixed(2), period: `${monthName(locale, p.periodYear, p.periodMonth, "short")} ${p.periodYear}`})}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pendingId === p.id}
                    onClick={() => handleRefund(p.id)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {pendingId === p.id ? tp("refunding") : tp("refundAction")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  );
}
