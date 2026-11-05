import {eq} from "drizzle-orm";
import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";

export type FinancialSettings = {
  tariffPerSqm: number;
  billingStart: string;
  dueDay: number;
};

/** Tenant finance settings. The tariff is the only source of owner charges. */
export async function getFinancialSettings(tenantId: string): Promise<FinancialSettings> {
  const [row] = await db
    .select({
      tariffPerSqm: tenants.tariffPerSqm,
      billingStart: tenants.billingStart,
      dueDay: tenants.dueDay,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!row) throw new Error("Tenant not found");
  return {
    tariffPerSqm: Number(row.tariffPerSqm),
    billingStart: row.billingStart,
    dueDay: row.dueDay,
  };
}

export async function updateFinancialSettings(
  tenantId: string,
  input: {tariffPerSqm: string; billingStart: string; dueDay: number},
): Promise<FinancialSettings> {
  const tariff = Number(input.tariffPerSqm);
  if (!Number.isFinite(tariff) || tariff <= 0) throw new Error("Tariff must be positive");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billingStart)) throw new Error("Billing start must be YYYY-MM");
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 28) throw new Error("Due day must be 1-28");

  await db
    .update(tenants)
    .set({
      tariffPerSqm: tariff.toFixed(2),
      billingStart: input.billingStart,
      dueDay: input.dueDay,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  return getFinancialSettings(tenantId);
}
