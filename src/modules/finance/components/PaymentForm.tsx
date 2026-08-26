"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { registerPaymentAction } from "@/modules/finance/finance.actions";

type UnitOption = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  ownerName: string | null;
  ownerId: string | null;
};

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
  const [method, setMethod] = useState<
    "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal"
  >("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const selected = units.find((u) => u.id === unitId);

  const methods: Array<
    "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal"
  > = ["cash", "bank_transfer", "card", "e_manat", "pos_terminal"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      toast.error(`${t("payments.unit")} — ${tc("common.unitNumber")}`);
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error(tc("amount"));
      return;
    }
    if (!selected?.ownerId) {
      toast.error(t("payments.owner"));
      return;
    }

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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: tc(`months.${i + 1}`),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="pay-unit">{t("payments.unit")}</Label>
        <Select value={unitId} onValueChange={(v) => setUnitId(v ?? "")}>
          <SelectTrigger id="pay-unit" className="mt-1">
            <SelectValue>
              {(v) => {
                const u = units.find((x) => x.id === v);
                return u
                  ? `${td("block")} ${u.entrance}, ${tu("floor")} ${u.floor}, ${tu("unitNumber")} ${u.unitNumber}${u.ownerName ? ` — ${u.ownerName}` : ""}`
                  : t("payments.unit");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {td("block")} {u.entrance}, {tu("floor")} {u.floor},{" "}
                {tu("unitNumber")} {u.unitNumber}
                {u.ownerName ? ` — ${u.ownerName}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>
            {tc("amount")} ({tc("currency")})
          </Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pay-method">{t("payments.method")}</Label>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as typeof method)}
          >
            <SelectTrigger id="pay-method" className="mt-1">
              <SelectValue>
                {(v) =>
                  t(
                    `payments.paymentMethods.${v as typeof method}` as Parameters<
                      typeof t
                    >[0],
                  )
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`payments.paymentMethods.${m}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tc("year")}</Label>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            type="number"
            min={2024}
            max={2030}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pay-month">{tc("month")}</Label>
          <Select value={month} onValueChange={(v) => setMonth(v ?? "")}>
            <SelectTrigger id="pay-month" className="mt-1">
              <SelectValue>
                {(v) => months.find((m) => m.value === v)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t("payments.referenceNo")}</Label>
        <Input
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          placeholder={t("payments.referenceNo")}
          className="mt-1"
        />
      </div>

      <div>
        <Label>{t("payments.notes")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t("payments.notes")}
          className="mt-1"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("payments.registering") : t("payments.register")}
        </Button>
      </div>
    </form>
  );
}

export function PaymentDialog({
  units,
  open,
  onOpenChange,
}: {
  units: UnitOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.register")}</DialogTitle>
        </DialogHeader>
        {units.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("payments.noPayments")}</p>
        ) : (
          <PaymentForm units={units} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
