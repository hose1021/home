"use client";

import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {FilterSearch, SortableHead, TableFilters, matchesQuery, sortRows, useTableQuery, type SortDirection} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {todayIso} from "@/lib/date";
import {FinanceTable} from "@/modules/finance/components/finance-table";
import {createExpenseAction} from "@/modules/finance/finance.actions";
import {formatAmount, formatDate} from "@/modules/finance/money-format";
import type {ExpenseRow} from "@/modules/finance/services/expense.service";

export function ExpensesBoard({rows, canWrite}: {rows: ExpenseRow[]; canWrite: boolean}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useTableQuery("expenses");
  const [open, setOpen] = useState(false);

  const query = params.value("q");
  const sortKey = params.value("sort");
  const sortDir: SortDirection = params.value("dir") === "desc" ? "desc" : "asc";

  const filtered = rows.filter((row) => matchesQuery(query, [row.description, row.expenseDate]));
  const sorted = sortRows(filtered, sortKey, sortDir, {
    date: (row) => row.expenseDate,
    item: (row) => row.description,
    amount: (row) => Number(row.amount),
  });
  const sort = {key: sortKey, direction: sortDir};
  const total = sorted.reduce((sum, row) => sum + Number(row.amount), 0);

  function toggle(key: string) {
    if (sortKey !== key) params.update({sort: key, dir: "asc"});
    else if (sortDir === "asc") params.update({dir: "desc"});
    else params.update({sort: "", dir: ""});
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <TableFilters>
          <FilterSearch value={query} onChange={(value) => params.update({q: value})} placeholder={t("expensesPage.search")} clearLabel={t("filters.clear")} />
        </TableFilters>
        <p className="ml-auto text-xs text-muted-foreground tabular-nums">{sorted.length} / {rows.length} {tc("pieces")}</p>
        {canWrite && <Button size="sm" onClick={() => setOpen(true)}>+ {t("expensesPage.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>{tc("amount")} <span className="amount font-semibold text-foreground">{formatAmount(total)}</span></span>
      </div>

      <FinanceTable>
          <TableHeader>
            <TableRow>
              <SortableHead label={tc("date")} sortKey="date" sort={sort} onSort={toggle} />
              <SortableHead label={t("expensesPage.item")} sortKey="item" sort={sort} onSort={toggle} />
              <SortableHead label={tc("amount")} sortKey="amount" align="right" sort={sort} onSort={toggle} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(row.expenseDate, locale)}</TableCell>
                <TableCell className="text-sm font-medium">{row.description}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatAmount(row.amount)}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? t("expensesPage.empty") : t("filters.notFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
      </FinanceTable>

      <ExpenseDialog open={open} onOpenChange={setOpen} onDone={() => router.refresh()} />
    </>
  );
}

function ExpenseDialog({open, onOpenChange, onDone}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createExpenseAction({amount, description, expenseDate});
      setAmount("");
      setDescription("");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("expensesPage.create")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="expense-description">{t("expensesPage.item")}</Label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("expensesPage.itemHint")}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expense-amount">{t("expensesPage.amountLabel")}</Label>
              <Input id="expense-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="expense-date">{t("expensesPage.dateLabel")}</Label>
              <Input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>{t("expensesPage.save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
