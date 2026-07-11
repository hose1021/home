"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {generateMonthlyCharges} from "./services/charge.service";
import {ownerBelongsToUser, registerPayment} from "./services/payment.service";
import {db} from "@/core/db";
import {funds} from "@/core/db/schema/funds";
import {and, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {hasStaffRole} from "@/core/auth/permissions";
import {ForbiddenError} from "@/core/errors/app-error";

export async function generateChargesAction(input: {
  templateId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
}) {
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
  referenceNo?: string;
  notes?: string;
}) {
  const { session, tenantId } = await requireTenantPermission("payment:write");
  if (!hasStaffRole(session.user.roles)) {
    const isOwnPayment = await ownerBelongsToUser(tenantId, input.ownerId, session.user.id);
    if (!isOwnPayment) throw new ForbiddenError("You can only register your own payment");
  }
  await registerPayment(tenantId, input, session.user.id);
  revalidatePath("/finance");
  return { success: true };
}

export async function markChargePaidAction(chargeId: string) {
  const { session, tenantId } = await requireTenantPermission("charge:write");
  const { charges } = await import("@/core/db/schema/charges");
  const [existing] = await db
    .select()
    .from(charges)
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new Error("Charge not found");

  await db
    .update(charges)
    .set({ status: "paid" })
    .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)));

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "update",
    entityType: "charge",
    entityId: chargeId,
    oldValues: { status: existing.status } as Record<string, unknown>,
    newValues: { status: "paid" } as Record<string, unknown>,
  });

  revalidatePath("/finance");
  return { success: true };
}

export async function createFundAction(input: {
  name: string;
  type: "operating" | "reserve" | "repair" | "emergency" | "special";
  description?: string;
  targetAmount?: string;
}) {
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
