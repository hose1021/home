"use client";

import {useLocale, useTranslations} from "next-intl";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

function formatMonth(month: string, locale: string): string {
  const [year, num] = month.split("-").map(Number);
  return new Date(year ?? 1970, (num ?? 1) - 1, 1).toLocaleDateString(locale, {month: "short", year: "numeric"});
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="surface-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
            {head.map((cell, index) => (
              <th key={index} className="px-4 py-2.5">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">{children}</tbody>
      </table>
    </div>
  );
}

export function ReportsView({
  debtByOwner,
  incomeExpense,
  debtAging,
  audit,
}: {
  debtByOwner: { ownerName: string; units: string; charged: string; paid: string; debt: string }[];
  incomeExpense: {
    monthlyIncome: { month: string; amount: string }[];
    expenses: { date: string; notes: string; amount: string }[];
    totalIncome: string;
    totalExpense: string;
    balance: string;
  };
  debtAging: { buckets: { key: string; total: string; count: number }[]; total: string };
  audit: { id: string; action: string; entityType: string; createdAt: string; userName: string | null }[];
}) {
  const t = useTranslations("reports");
  const ta = useTranslations("audit");
  const locale = useLocale();
  const ageingLabels: Record<string, string> = {
    notDue: t("aging.notDue"),
    days1to30: t("aging.days1to30"),
    days31to90: t("aging.days31to90"),
    over90: t("aging.over90"),
  };

  return (
    <Tabs defaultValue="debt">
      <TabsList className="flex-wrap">
        <TabsTrigger value="debt">{t("tabs.debt")}</TabsTrigger>
        <TabsTrigger value="income">{t("tabs.income")}</TabsTrigger>
        <TabsTrigger value="aging">{t("tabs.aging")}</TabsTrigger>
        <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>
      </TabsList>

      <TabsContent value="debt" className="space-y-4">
        {debtByOwner.length > 0 ? (
          <Table head={[t("debt.owner"), t("debt.units"), t("debt.charged"), t("debt.paid"), t("debt.debt")]}>
            {debtByOwner.map((row) => (
              <tr key={row.ownerName} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.ownerName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.units}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.charged}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.paid}</td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${Number(row.debt) > 0 ? "text-destructive" : "text-success"}`}>{row.debt}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t("debt.empty")}</p>
        )}
      </TabsContent>

      <TabsContent value="income" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">{t("income.totalIncome")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-success">{incomeExpense.totalIncome}</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">{t("income.totalExpense")}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-danger">{incomeExpense.totalExpense}</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">{t("income.balance")}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${Number(incomeExpense.balance) >= 0 ? "text-success" : "text-danger"}`}>{incomeExpense.balance}</p>
          </div>
        </div>
        {incomeExpense.monthlyIncome.length > 0 && (
          <Table head={[t("income.month"), t("income.amount")]}>
            {incomeExpense.monthlyIncome.map((row) => (
              <tr key={row.month} className="hover:bg-muted/30">
                <td className="px-4 py-3">{formatMonth(row.month, locale)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.amount}</td>
              </tr>
            ))}
          </Table>
        )}
        {incomeExpense.expenses.length > 0 && (
          <Table head={[t("income.date"), t("income.item"), t("income.sum")]}>
            {incomeExpense.expenses.map((row) => (
              <tr key={`${row.date}-${row.notes}`} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.date}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.notes || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.amount}</td>
              </tr>
            ))}
          </Table>
        )}
      </TabsContent>

      <TabsContent value="aging" className="space-y-4">
        <Table head={[t("aging.bucket"), t("aging.count"), t("aging.amount")]}>
          {debtAging.buckets.map((bucket) => (
            <tr key={bucket.key} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{ageingLabels[bucket.key] ?? bucket.key}</td>
              <td className="px-4 py-3 text-muted-foreground">{bucket.count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{bucket.total}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-muted/20">
            <td className="px-4 py-3 font-semibold">{t("aging.total")}</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{debtAging.total}</td>
          </tr>
        </Table>
      </TabsContent>

      <TabsContent value="audit" className="space-y-4">
        {audit.length > 0 ? (
          <Table head={[t("audit.action"), t("audit.entity"), t("audit.user"), t("audit.date")]}>
            {audit.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">{ta(`log.${log.action}`)}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.entityType}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.userName ?? "—"}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{new Date(log.createdAt).toLocaleString(locale)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t("audit.empty")}</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
