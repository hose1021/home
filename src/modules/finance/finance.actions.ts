"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {generateMonthlyCharges, listCharges} from "./services/charge.service";
import {registerPayment, listPayments} from "./services/payment.service";
import {db} from "@/core/db";
import {funds} from "@/core/db/schema/funds";
import {eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function generateChargesAction(slug: string, input: {
  templateId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "charge:write");
  const created = await generateMonthlyCharges(tenantId, input, session.user.id);
  revalidatePath(`/${slug}/finance`);
  return { success: true, count: created.length };
}

export async function registerPaymentAction(slug: string, input: {
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
  const { session, tenantId } = await requireTenantPermission(slug, "payment:write");
  await registerPayment(tenantId, input, session.user.id);
  revalidatePath(`/${slug}/finance`);
  return { success: true };
}

export async function markChargePaidAction(slug: string, chargeId: string) {
  const { session, tenantId } = await requireTenantPermission(slug, "charge:write");
  const { charges } = await import("@/core/db/schema/charges");
  const [existing] = await db.select().from(charges).where(eq(charges.id, chargeId)).limit(1);
  if (!existing) throw new Error("Charge not found");

  await db.update(charges).set({ status: "paid" }).where(eq(charges.id, chargeId));

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "update",
    entityType: "charge",
    entityId: chargeId,
    oldValues: { status: existing.status } as Record<string, unknown>,
    newValues: { status: "paid" } as Record<string, unknown>,
  });

  revalidatePath(`/${slug}/finance`);
  return { success: true };
}

export async function createFundAction(slug: string, input: {
  name: string;
  type: "operating" | "reserve" | "repair" | "emergency" | "special";
  description?: string;
  targetAmount?: string;
}) {
  const { session, tenantId } = await requireTenantPermission(slug, "fund:write");
  const [fund] = await db.insert(funds).values({
    tenantId,
    name: input.name,
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

  revalidatePath(`/${slug}/finance`);
  return { success: true };
}
