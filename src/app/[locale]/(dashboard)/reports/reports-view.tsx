"use client";

import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

const MONTHS = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const ACTION_LABELS: Record<string, string> = {
  create: "Создание", update: "Изменение", delete: "Удаление",
  restore: "Восстановление", login: "Вход", export: "Экспорт",
};

const FUND_TYPE_LABELS: Record<string, string> = {
  operating: "Операционный", reserve: "Резервный", repair: "Ремонтный",
  emergency: "Чрезвычайный", special: "Специальный",
};

function formatMonth(month: string): string {
  const [year, num] = month.split("-").map(Number);
  return `${MONTHS[num ?? 0] ?? ""} ${year ?? ""}`.trim();
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="surface-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
            {head.map((cell) => (
              <th key={cell} className="px-4 py-2.5">{cell}</th>
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
  budgetVsActual,
  funds,
  debtAging,
  audit,
}: {
  debtByOwner: { ownerName: string; units: string; charged: string; paid: string; debt: string }[];
  incomeExpense: {
    monthlyIncome: { month: string; amount: string }[];
    expenses: { accountCode: string; notes: string; amount: string }[];
    totalIncome: string;
    totalExpense: string;
    balance: string;
  };
  budgetVsActual: {
    rows: { accountCode: string; notes: string; kind: string; planned: string; actual: string; diff: string }[];
    totalPlanned: string;
    totalActual: string;
  };
  funds: { name: string; type: string; target: string | null; current: string; filledPercent: number | null }[];
  debtAging: { buckets: { label: string; total: string; count: number }[]; total: string };
  audit: { id: string; action: string; entityType: string; createdAt: string; userName: string | null }[];
}) {
  return (
    <Tabs defaultValue="debt">
      <TabsList className="flex-wrap">
        <TabsTrigger value="debt">Задолженность</TabsTrigger>
        <TabsTrigger value="income">Доходы и расходы</TabsTrigger>
        <TabsTrigger value="budget">Бюджет vs Факт</TabsTrigger>
        <TabsTrigger value="funds">Фонды</TabsTrigger>
        <TabsTrigger value="aging">Деб. задолженность</TabsTrigger>
        <TabsTrigger value="audit">Аудит</TabsTrigger>
      </TabsList>

      <TabsContent value="debt" className="space-y-4">
        {debtByOwner.length > 0 ? (
          <Table head={["Собственник", "Квартиры", "Начислено", "Оплачено", "Долг"]}>
            {debtByOwner.map((row) => (
              <tr key={row.ownerName} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.ownerName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.units}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.charged} ₼</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.paid} ₼</td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${Number(row.debt) > 0 ? "text-destructive" : "text-emerald-600"}`}>{row.debt} ₼</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Задолженности нет</p>
        )}
      </TabsContent>

      <TabsContent value="income" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Доходы (оплачено)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">{incomeExpense.totalIncome} ₼</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Расходы (факт)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-red-600">{incomeExpense.totalExpense} ₼</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Фактический баланс</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${Number(incomeExpense.balance) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{incomeExpense.balance} ₼</p>
          </div>
        </div>
        {incomeExpense.monthlyIncome.length > 0 && (
          <Table head={["Месяц", "Доход"]}>
            {incomeExpense.monthlyIncome.map((row) => (
              <tr key={row.month} className="hover:bg-muted/30">
                <td className="px-4 py-3">{formatMonth(row.month)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.amount} ₼</td>
              </tr>
            ))}
          </Table>
        )}
        {incomeExpense.expenses.length > 0 && (
          <Table head={["Счёт", "Статья", "Сумма"]}>
            {incomeExpense.expenses.map((row) => (
              <tr key={row.accountCode} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.accountCode}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.notes || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.amount} ₼</td>
              </tr>
            ))}
          </Table>
        )}
      </TabsContent>

      <TabsContent value="budget" className="space-y-4">
        {budgetVsActual.rows.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="surface-panel p-4">
                <p className="text-xs text-muted-foreground">План</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{budgetVsActual.totalPlanned} ₼</p>
              </div>
              <div className="surface-panel p-4">
                <p className="text-xs text-muted-foreground">Факт</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{budgetVsActual.totalActual} ₼</p>
              </div>
            </div>
            <Table head={["Счёт", "Статья", "Тип", "План", "Факт", "Отклонение"]}>
              {budgetVsActual.rows.map((row) => (
                <tr key={row.accountCode} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.accountCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.notes || "—"}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{row.kind}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.planned} ₼</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.actual} ₼</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${Number(row.diff) >= 0 ? "text-emerald-600" : "text-destructive"}`}>{row.diff} ₼</td>
                </tr>
              ))}
            </Table>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Бюджет не создан</p>
        )}
      </TabsContent>

      <TabsContent value="funds" className="space-y-4">
        {funds.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {funds.map((fund) => (
              <div key={fund.name} className="surface-panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{fund.name}</p>
                  <Badge variant="secondary">{FUND_TYPE_LABELS[fund.type] ?? fund.type}</Badge>
                </div>
                <div className="mt-3 flex items-end justify-between text-sm">
                  <span className="text-muted-foreground">Баланс фонда</span>
                  <span className="text-lg font-bold tabular-nums">{fund.current} ₼</span>
                </div>
                {fund.target && fund.filledPercent !== null && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Цель: {fund.target} ₼</span>
                      <span>{Math.round(fund.filledPercent)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${fund.filledPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Фонды не созданы</p>
        )}
      </TabsContent>

      <TabsContent value="aging" className="space-y-4">
        <Table head={["Период просрочки", "Начислений", "Сумма"]}>
          {debtAging.buckets.map((bucket) => (
            <tr key={bucket.label} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{bucket.label}</td>
              <td className="px-4 py-3 text-muted-foreground">{bucket.count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{bucket.total} ₼</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-muted/20">
            <td className="px-4 py-3 font-semibold">Итого</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{debtAging.total} ₼</td>
          </tr>
        </Table>
      </TabsContent>

      <TabsContent value="audit" className="space-y-4">
        {audit.length > 0 ? (
          <Table head={["Действие", "Сущность", "Пользователь", "Дата"]}>
            {audit.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.entityType}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.userName ?? "—"}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{new Date(log.createdAt).toLocaleString("ru")}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Событий аудита пока нет</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
