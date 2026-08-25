"use client";

import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {approveBudgetAction, submitForApprovalAction} from "@/modules/finance/budget.actions";

export function BudgetActions({
  budgetId,
  status,
}: {
  budgetId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    try {
      await submitForApprovalAction(budgetId);
      toast.success("Бюджет отправлен на утверждение");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleApprove() {
    setPending(true);
    try {
      await approveBudgetAction(budgetId);
      toast.success("Бюджет утверждён");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (status === "approved") return null;

  return (
    <div className="flex items-center gap-2">
      {status === "draft" && (
        <Button variant="outline" size="sm" onClick={handleSubmit} disabled={pending}>
          На утверждение
        </Button>
      )}
      {status === "pending_approval" && (
        <Button size="sm" onClick={handleApprove} disabled={pending}>
          Утвердить
        </Button>
      )}
    </div>
  );
}
