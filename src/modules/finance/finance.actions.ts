"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {generateMonthlyCharges} from "./services/charge.service";
import {markChargePaidIfSettled, ownerBelongsToUser, registerPayment} from "./services/payment.service";
import {db} from "@/core/db";
import {funds} from "@/core/db/schema/funds";
import {writeAuditLog} from "@/core/audit/audit.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";
import {moneySchema, paymentInputSchema, uuidSchema} from "@/core/validation/action-schemas";
import {z} from "zod";

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

export async function createFundAction(input: {
  name: string;
  type: "reserve" | "repair" | "improvement" | "emergency" | "other";
  description?: string;
  targetAmount?: string;
}) {
  input = fundInputSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("fund:write");
  const name = input.name.trim();
  if (!name) throw new Error("Fund name is required");
  if (input.targetAmount !== undefined) {
    const targetAmount = Number(input.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount < 0) throw new Error("Invalid target amount");
  }
  const [fund] = await db.insert(funds).values({
    tenantId,
    name,
    type: input.type,
    description: input.description ?? null,
    targetAmount: input.targetAmount ?? null,
  }).returning();

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "create",
    entityType: "fund",
    entityId: fund.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  revalidatePath("/finance");
  return { success: true };
}
