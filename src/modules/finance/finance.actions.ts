"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {hasStaffRole} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {ForbiddenError} from "@/core/errors/app-error";
import {moneySchema, paymentInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {generateMonthlyCharges} from "./services/charge.service";
import {createFund, topUpFund} from "./services/fund.service";
import {markChargePaidIfSettled, ownerBelongsToUser, registerPayment} from "./services/payment.service";

const chargeInputSchema = z.object({
  templateId: uuidSchema,
  periodYear: z.number().int().min(2000).max(2200),
  periodMonth: z.number().int().min(1).max(12),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const fundInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["reserve", "repair", "improvement", "emergency", "other"]),
  description: z.string().trim().max(2000).optional(),
  targetAmount: moneySchema.optional(),
});

export async function generateChargesAction(input: {
  templateId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
}) {
  input = chargeInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("charge:write");
  const created = await generateMonthlyCharges(tenantId, input, session.user.id);
  revalidatePath("/finance");
  return { success: true, count: created.length };
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
  const { session, tenantId } = await requireTenantPermission("payment:write");
  if (!hasStaffRole(session.user.roles)) {
    const isOwnPayment = await ownerBelongsToUser(tenantId, input.ownerId, session.user.id);
    if (!isOwnPayment) throw new ForbiddenError("You can only register your own payment");
  }
  await registerPayment(tenantId, input, session.user.id);
  revalidatePath("/finance");
  revalidatePath(`/owners/${input.ownerId}`);
  return { success: true };
}

export async function markChargePaidAction(chargeId: string) {
  chargeId = uuidSchema.parse(chargeId);
  const { session, tenantId } = await requireTenantPermission("charge:write");
  await markChargePaidIfSettled(tenantId, chargeId, session.user.id);

  revalidatePath("/finance");
  return { success: true };
}

const fundTopUpSchema = z.object({ fundId: uuidSchema, amount: moneySchema });

export async function createFundAction(input: {
  name: string;
  type: "reserve" | "repair" | "improvement" | "emergency" | "other";
  description?: string;
  targetAmount?: string;
}) {
  input = fundInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("fund:write");
  await createFund(tenantId, input, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function topUpFundAction(input: { fundId: string; amount: string }) {
  input = fundTopUpSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("fund:write");
  await topUpFund(tenantId, input.fundId, input.amount, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}
