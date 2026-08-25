"use client";

import {useState} from "react";
import {toast} from "sonner";
import {registerPaymentAction} from "@/modules/finance/finance.actions";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {useTranslations} from "next-intl";

type UnitOption = { id: string; unitNumber: string; entrance: number; floor: number; ownerName: string | null; ownerId: string | null };

export function PaymentForm({
  units,
  onDone,
}: {
  units: UnitOption[];
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const td = useTranslations("dashboard");
  const tu = useTranslations("units");
  const [pending, setPending] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal">("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const selected = units.find((u) => u.id === unitId);

  const methods: Array<"cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal"> = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) { toast.error(`${t("payments.unit")} — ${tc("common.unitNumber")}`); return; }
    if (!amount || Number(amount) <= 0) { toast.error(tc("amount")); return; }
    if (!selected?.ownerId) { toast.error(t("payments.owner")); return; }

    setPending(true);
    try {
      await registerPaymentAction({
        unitId,
        ownerId: selected.ownerId,
        amount,
        periodYear: Number(year),
        periodMonth: Number(month),
        paymentMethod: method,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      });
      toast.success(t("payments.register"));
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const months = Array.from({length: 12}, (_, i) => ({
    value: String(i + 1),
    label: tc(`months.${i + 1}`),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t("payments.unit")}</Label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t("payments.unit")}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {td("block")} {u.entrance}, {tu("floor")} {u.floor}, {tu("unitNumber")} {u.unitNumber}{u.ownerName ? ` — ${u.ownerName}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tc("amount")} ({tc("currency")})</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" />
        </div>
        <div>
          <Label>{t("payments.method")}</Label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {methods.map((m) => <option key={m} value={m}>{t(`payments.paymentMethods.${m}` as Parameters<typeof t>[0])}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tc("year")}</Label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={2024} max={2030} className="mt-1" />
        </div>
        <div>
          <Label>{tc("month")}</Label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>{t("payments.referenceNo")}</Label>
        <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder={t("payments.referenceNo")} className="mt-1" />
      </div>

      <div>
        <Label>{t("payments.notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("payments.notes")} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? t("payments.registering") : t("payments.register")}</Button>
      </div>
    </form>
  );
}

export function PaymentDialog({ units, open, onOpenChange }: {
  units: UnitOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("payments.register")}</DialogTitle></DialogHeader>
        {units.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("payments.noPayments")}</p>
        ) : (
          <PaymentForm units={units} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
