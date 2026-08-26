"use client";

import {useState} from "react";
import {toast} from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addBudgetItemAction,
  updateBudgetItemAction,
  deleteBudgetItemAction,
} from "@/modules/finance/budget.actions";
import {
  INCOME_ACCOUNT_CODES,
  EXPENSE_ACCOUNT_CODES,
} from "@/modules/finance/constants";

type BudgetItem = {
  id: string;
  accountCode: string;
  plannedAmount: string;
  actualAmount: string;
  notes: string | null;
};

const ACCOUNT_LABELS: Record<string, string> = {
  "4010": "Членские взносы (ежемесячные)",
  "4020": "Целевые взносы",
  "4030": "Доходы от аренды",
  "4040": "Штрафы и пени",
  "4050": "Спонсорство и пожертвования",
  "4090": "Прочие доходы",
  "5010": "Зарплата персонала",
  "5011": "Зарплата администратора",
  "5012": "Зарплата охраны",
  "5020": "Коммунальные услуги",
  "5030": "Ремонт и обслуживание",
  "5040": "Уборка и санитария",
  "5050": "Лифтовое обслуживание",
  "5060": "Охрана и безопасность",
  "5070": "Страхование",
  "5080": "Юридические услуги",
  "5090": "Банковские комиссии",
  "5100": "Офисные расходы",
  "5990": "Резервный фонд",
  "5991": "Капитальный ремонт",
  "3020": "Налоги и сборы",
};

export function BudgetTable({
  budgetId,
  items,
  canEdit,
  totalIncome,
  totalExpense,
  monthlyFeeIncome,
}: {
  budgetId: string;
  items: BudgetItem[];
  canEdit: boolean;
  totalIncome: string;
  totalExpense: string;
  monthlyFeeIncome: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("income");
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<BudgetItem | null>(null);
  const [pending, setPending] = useState(false);

  const incomeItems = items.filter((i) => (INCOME_ACCOUNT_CODES as readonly string[]).includes(i.accountCode));
  const expenseItems = items.filter((i) => (EXPENSE_ACCOUNT_CODES as readonly string[]).includes(i.accountCode));

  const incomeActual = incomeItems.reduce((s, i) =>
    s + (i.accountCode === "4010" ? Number(monthlyFeeIncome) : Number(i.actualAmount)), 0).toFixed(2);
  const expenseActual = expenseItems.reduce((s, i) => s + Number(i.actualAmount), 0).toFixed(2);

  function openAdd(type: "income" | "expense") {
    setAddType(type);
    setAddOpen(true);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addBudgetItemAction(budgetId, {
        accountCode: fd.get("accountCode") as string,
        plannedAmount: fd.get("plannedAmount") as string,
        notes: (fd.get("notes") as string) || undefined,
      });
      setAddOpen(false);
      toast.success("Статья добавлена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateBudgetItemAction(budgetId, editItem.id, {
        plannedAmount: fd.get("plannedAmount") as string,
        notes: (fd.get("notes") as string) || undefined,
        actualAmount: editItem.accountCode === "4010" ? undefined : ((fd.get("actualAmount") as string) || undefined),
      });
      setEditItem(null);
      toast.success("Статья обновлена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setPending(true);
    try {
      await deleteBudgetItemAction(budgetId, deleteItem.id);
      setDeleteItem(null);
      toast.success("Статья удалена");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const codeOptions = (type: "income" | "expense") => {
    const codes = type === "income" ? INCOME_ACCOUNT_CODES : EXPENSE_ACCOUNT_CODES;
    return codes.map((code) => ({
      value: code,
      label: ACCOUNT_LABELS[code] ?? code,
    }));
  };

  const renderTable = (title: string, rows: BudgetItem[], total: string, actualTotal: string, type: "income" | "expense", colorClass: string) => (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <h2 className={`text-sm font-semibold ${colorClass}`}>{title}</h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => openAdd(type)}>
            + Статья
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Статья</TableHead>
            <TableHead className="w-[140px] text-right">План (₼)</TableHead>
            <TableHead className="w-[140px] text-right">Факт (₼)</TableHead>
            {canEdit && <TableHead className="w-[120px] text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 3 : 2} className="text-center text-muted-foreground">
                Нет статей
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell className="text-sm font-medium">
                  {ACCOUNT_LABELS[item.accountCode] ?? item.accountCode}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {Number(item.plannedAmount).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {item.accountCode === "4010"
                    ? Number(monthlyFeeIncome).toFixed(2)
                    : Number(item.actualAmount).toFixed(2)}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}>Ред.</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteItem(item)}>Удалить</Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
          <TableRow className="bg-muted/30 font-semibold">
            <TableCell className="text-sm">Итого</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{Number(total).toFixed(2)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{Number(actualTotal).toFixed(2)}</TableCell>
            {canEdit && <TableCell />}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {renderTable("Доходы", incomeItems, totalIncome, incomeActual, "income", "text-emerald-600")}
        {renderTable("Расходы", expenseItems, totalExpense, expenseActual, "expense", "text-red-600")}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addType === "income" ? "Добавить доход" : "Добавить расход"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Статья</label>
              <select name="accountCode" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {codeOptions(addType).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Плановая сумма (₼)</label>
              <input name="plannedAmount" type="number" step="0.01" min="0" required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <div>
              <label className="block text-sm font-medium">Примечание</label>
              <input name="notes" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending}>{pending ? "Добавление..." : "Добавить"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать статью</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={handleEdit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {ACCOUNT_LABELS[editItem.accountCode] ?? editItem.accountCode}
              </p>
              <div>
                <label className="block text-sm font-medium">Плановая сумма (₼)</label>
                <input name="plannedAmount" type="number" step="0.01" min="0" defaultValue={editItem.plannedAmount} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              {editItem.accountCode !== "4010" && (
                <div>
                  <label className="block text-sm font-medium">Факт (₼)</label>
                  <input name="actualAmount" type="number" step="0.01" min="0" defaultValue={editItem.actualAmount} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium">Примечание</label>
                <input name="notes" defaultValue={editItem.notes ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Отмена</Button>
                <Button type="submit" disabled={pending}>{pending ? "Сохранение..." : "Сохранить"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью бюджета</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem && <>Статья «{ACCOUNT_LABELS[deleteItem.accountCode] ?? deleteItem.accountCode}» будет удалена.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
