"use client";

import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {FilterSearch, TableFilters, matchesQuery} from "@/components/table-filters";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {createExpenseAction} from "@/modules/finance/finance.actions";
import {formatAmount} from "@/modules/finance/money-format";
import type {ExpenseRow} from "@/modules/finance/services/expense.service";

export function ExpensesBoard({rows, canWrite}: {rows: ExpenseRow[]; canWrite: boolean}) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = rows.filter((row) => matchesQuery(query, [row.description, row.expenseDate]));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableFilters>
          <FilterSearch value={query} onChange={setQuery} placeholder={t("expensesPage.search")} clearLabel={t("filters.clear")} />
        </TableFilters>
        <p className="text-sm text-muted-foreground">{filtered.length} / {rows.length} {tc("pieces")}</p>
        {canWrite && <Button size="sm" onClick={() => setOpen(true)}>+ {t("expensesPage.create")}</Button>}
      </div>

      <div className="surface-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("date")}</TableHead>
              <TableHead>{t("expensesPage.item")}</TableHead>
              <TableHead className="text-right">{tc("amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm text-muted-foreground">{row.expenseDate}</TableCell>
                <TableCell className="text-sm font-medium">{row.description}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatAmount(row.amount)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground/70">
                  {rows.length === 0 ? t("expensesPage.empty") : t("filters.notFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

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
