"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import type {PaymentMethod} from "@/core/db/schema/enums";
import {BILLING} from "@/core/db/schema/enums";
import {dateSchema, moneySchema, monthSchema, paymentInputSchema, periodSchema} from "@/core/validation/action-schemas";
import {generateMonthlyCharges} from "./services/charge.service";
import {createExpense} from "./services/expense.service";
import {registerPayment, requireOwnerPaymentAccess} from "./services/payment.service";
import {updateFinancialSettings} from "./services/settings.service";

const expenseInputSchema = z.object({
  amount: moneySchema,
  description: z.string().trim().min(1).max(500),
  expenseDate: dateSchema,
});

const settingsInputSchema = z.object({
  tariffPerSqm: moneySchema,
  billingStart: monthSchema,
  dueDay: z.number().int().min(1).max(BILLING.maxDueDay),
});

const chargeRevalidate = ["/finance", "/finance/charges", "/finance/debts", "/owners"];

export async function generateChargesAction(input: {periodYear: number; periodMonth: number}) {
  return runAction({
    permission: "charge:write",
    schema: periodSchema,
    errors: "errors",
    revalidate: chargeRevalidate,
    handler: async ({tenantId, session}, data) => {
      const created = await generateMonthlyCharges(tenantId, data, session.user.id);
      return {success: true, count: created.length};
    },
  }, input);
}

export async function registerPaymentAction(input: {
  chargeId?: string;
  unitId: string;
  ownerId: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentMethod: PaymentMethod;
  tariffPerSqm?: string;
  referenceNo?: string;
  notes?: string;
}) {
  return runAction({
    permission: "payment:write",
    schema: paymentInputSchema,
    errors: "errors",
    authorize: ({tenantId, session}, data) =>
      requireOwnerPaymentAccess(tenantId, data.ownerId, session.user.id, session.user.roles),
    revalidate: (data) => ["/finance", "/finance/payments", "/finance/debts", "/owners", `/owners/${data.ownerId}`],
    handler: async ({tenantId, session}, data) => {
      await registerPayment(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function createExpenseAction(input: {amount: string; description: string; expenseDate: string}) {
  return runAction({
    permission: "budget:write",
    schema: expenseInputSchema,
    errors: "errors",
    revalidate: ["/finance", "/finance/expenses"],
    handler: async ({tenantId, session}, data) => {
      await createExpense(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function updateFinancialSettingsAction(input: {tariffPerSqm: string; billingStart: string; dueDay: number}) {
  return runAction({
    permission: "settings:write",
    schema: settingsInputSchema,
    errors: "errors",
    revalidate: ["/finance", "/finance/settings"],
    handler: async ({tenantId}, data) => {
      await updateFinancialSettings(tenantId, data);
      return {success: true};
    },
  }, input);
}
