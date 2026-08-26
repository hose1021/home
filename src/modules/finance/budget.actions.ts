"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {budgetItemSchema, budgetItemUpdateSchema, budgetYearSchema, uuidSchema} from "@/core/validation/action-schemas";
import {
  createBudget,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  updateBudgetStatus,
} from "./services/budget.service";

export async function createBudgetAction(year: number) {
  year = budgetYearSchema.parse(year);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await createBudget(tenantId, year, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function approveBudgetAction(budgetId: string) {
  budgetId = uuidSchema.parse(budgetId);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await updateBudgetStatus(tenantId, budgetId, "approved", session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function submitForApprovalAction(budgetId: string) {
  budgetId = uuidSchema.parse(budgetId);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await updateBudgetStatus(tenantId, budgetId, "pending_approval", session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function addBudgetItemAction(budgetId: string, input: {
  accountCode: string;
  plannedAmount: string;
  notes?: string;
}) {
  budgetId = uuidSchema.parse(budgetId);
  input = budgetItemSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await addBudgetItem(tenantId, budgetId, input, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function updateBudgetItemAction(budgetId: string, itemId: string, input: {
  plannedAmount?: string;
  notes?: string;
  actualAmount?: string;
}) {
  budgetId = uuidSchema.parse(budgetId);
  itemId = uuidSchema.parse(itemId);
  input = budgetItemUpdateSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await updateBudgetItem(tenantId, budgetId, itemId, input, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function deleteBudgetItemAction(budgetId: string, itemId: string) {
  budgetId = uuidSchema.parse(budgetId);
  itemId = uuidSchema.parse(itemId);
  const { session, tenantId } = await requireTenantPermission("budget:write");
  await deleteBudgetItem(tenantId, budgetId, itemId, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}
