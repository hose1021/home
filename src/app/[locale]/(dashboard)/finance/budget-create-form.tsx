"use client";

import {useState} from "react";
import {createBudgetAction} from "@/modules/finance/budget.actions";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {IconCalculator} from "@tabler/icons-react";

export function BudgetCreateForm() {
  const [pending, setPending] = useState(false);
  const currentYear = new Date().getFullYear();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createBudgetAction(Number(fd.get("year")));
    } catch {
      // ignore — page will revalidate and show budget
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-panel border-dashed p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
        <IconCalculator className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">Бюджет не создан</h3>
      <p className="mt-1 text-sm text-muted-foreground">Создайте бюджет для планирования ежемесячных доходов и расходов.</p>

      <Card className="mx-auto mt-6 max-w-sm">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Год</label>
              <select name="year" defaultValue={currentYear} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {Array.from({ length: 5 }, (_, i) => {
                  const y = currentYear + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Создание..." : "Создать бюджет"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
