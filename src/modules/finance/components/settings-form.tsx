"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {updateFinancialSettingsAction} from "@/modules/finance/finance.actions";

export function SettingsForm({tariffPerSqm, billingStart, dueDay}: {
  tariffPerSqm: number;
  billingStart: string;
  dueDay: number;
}) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [tariff, setTariff] = useState(tariffPerSqm.toFixed(2));
  const [start, setStart] = useState(billingStart);
  const [day, setDay] = useState(String(dueDay));
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await updateFinancialSettingsAction({
        tariffPerSqm: tariff,
        billingStart: start,
        dueDay: Number(day),
      });
      toast.success(t("settingsPage.saved"));
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-panel p-5">
      <h2 className="font-heading text-sm font-bold">{t("settingsPage.policy")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("settingsPage.policyHint")}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="tariff">{t("settingsPage.tariff")}</Label>
          <Input id="tariff" value={tariff} onChange={(e) => setTariff(e.target.value)} inputMode="decimal" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="billing-start">{t("settingsPage.billingStart")}</Label>
          <Input id="billing-start" value={start} onChange={(e) => setStart(e.target.value)} placeholder="2026-01" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="due-day">{t("settingsPage.dueDay")}</Label>
          <Input id="due-day" value={day} onChange={(e) => setDay(e.target.value)} type="number" min={1} max={28} className="mt-1" />
        </div>
      </div>
      <Button type="submit" className="mt-4" disabled={pending}>{t("settingsPage.save")}</Button>
    </form>
  );
}
