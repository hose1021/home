import {eq} from "drizzle-orm";
import {db} from "@/core/db";
import {BILLING} from "@/core/db/schema/enums";
import {tenants} from "@/core/db/schema/tenants";
import {DomainError} from "@/core/errors/app-error";

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
  if (!row) throw new DomainError("tenantNotFound");
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
  if (!Number.isFinite(tariff) || tariff <= 0) throw new DomainError("invalidTariff");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billingStart)) throw new DomainError("invalidBillingStart");
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > BILLING.maxDueDay) throw new DomainError("invalidDueDay");

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
