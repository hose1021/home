"use server";

import {revalidatePath} from "next/cache";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {payments} from "@/core/db/schema/payments";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function payForUnitAction(
  slug: string,
  ownerId: string,
  unitId: string,
  amount: string,
  periodYear: number,
  periodMonth: number,
  paymentMethod: "cash" | "bank_transfer" | "card" | "e_manat" | "pos_terminal",
  referenceNo?: string,
) {
  const { session, tenantId } = await requireTenantPermission(slug, "payment:write");

  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      unitId,
      ownerId,
      amount,
      periodYear,
      periodMonth,
      paymentMethod,
      referenceNo: referenceNo ?? null,
      paymentDate: new Date(),
      status: "confirmed",
      confirmedBy: session.user.id,
    })
    .returning();

  await writeAuditLog({
    tenantId,
    userId: session.user.id,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    newValues: { unitId, ownerId, amount, periodYear, periodMonth, paymentMethod },
  });

  revalidatePath(`/${slug}/owners/${ownerId}`);
  return { success: true, payment };
}
