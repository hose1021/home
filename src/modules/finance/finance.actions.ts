"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {hasStaffRole} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {ForbiddenError} from "@/core/errors/app-error";
import {moneySchema, paymentInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {generateMonthlyCharges} from "./services/charge.service";
import {createExpense} from "./services/expense.service";
import {markChargePaidIfSettled, ownerBelongsToUser, registerPayment} from "./services/payment.service";
import {updateFinancialSettings} from "./services/settings.service";

const chargeInputSchema = z.object({
  periodYear: z.number().int().min(2000).max(2200),
  periodMonth: z.number().int().min(1).max(12),
});

const expenseInputSchema = z.object({
  amount: moneySchema,
  description: z.string().trim().min(1).max(500),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const settingsInputSchema = z.object({
  tariffPerSqm: moneySchema,
  billingStart: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  dueDay: z.number().int().min(1).max(28),
});

export async function generateChargesAction(input: {periodYear: number; periodMonth: number}) {
  input = chargeInputSchema.parse(input);
  const {session, tenantId} = await requireTenantPermission("charge:write");
  const created = await generateMonthlyCharges(tenantId, input, session.user.id);
  revalidatePath("/finance");
  return {success: true, count: created.length};
}

export async function registerPaymentAction(input: {
  chargeId?: string;
  unitId: string;
  ownerId: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal";
  tariffPerSqm?: string;
  referenceNo?: string;
  notes?: string;
}) {
  input = paymentInputSchema.parse(input);
  const {session, tenantId} = await requireTenantPermission("payment:write");
  if (!hasStaffRole(session.user.roles)) {
    const isOwnPayment = await ownerBelongsToUser(tenantId, input.ownerId, session.user.id);
    if (!isOwnPayment) throw new ForbiddenError("You can only register your own payment");
  }
  await registerPayment(tenantId, input, session.user.id);
  revalidatePath("/finance");
  revalidatePath(`/owners/${input.ownerId}`);
  return {success: true};
}

export async function markChargePaidAction(chargeId: string) {
  chargeId = uuidSchema.parse(chargeId);
  const {session, tenantId} = await requireTenantPermission("charge:write");
  await markChargePaidIfSettled(tenantId, chargeId, session.user.id);

  revalidatePath("/finance");
  return {success: true};
}

export async function createExpenseAction(input: {amount: string; description: string; expenseDate: string}) {
  input = expenseInputSchema.parse(input);
  const {session, tenantId} = await requireTenantPermission("budget:write");
  await createExpense(tenantId, input, session.user.id);
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  return {success: true};
}

export async function updateFinancialSettingsAction(input: {tariffPerSqm: string; billingStart: string; dueDay: number}) {
  input = settingsInputSchema.parse(input);
  const {tenantId} = await requireTenantPermission("settings:write");
  await updateFinancialSettings(tenantId, input);
  revalidatePath("/finance/settings");
  revalidatePath("/finance");
  return {success: true};
}
