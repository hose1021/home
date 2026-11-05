import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {ownerships} from "@/core/db/schema/owners";
import {tenants} from "@/core/db/schema/tenants";
import {units} from "@/core/db/schema/units";

type GenerateChargesInput = {
  periodYear: number;
  periodMonth: number;
};

function dueDateFor(periodYear: number, periodMonth: number, dueDay: number): string {
  const lastDay = new Date(periodYear, periodMonth, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  return `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * One apartment charge per period: area × tenant tariff. The building pays services from the
 * collected money, so no other charge source exists.
 */
export async function generateMonthlyCharges(tenantId: string, input: GenerateChargesInput, userId: string) {
  if (!Number.isInteger(input.periodYear) || input.periodYear < 2000 || input.periodYear > 2200) {
    throw new Error("Invalid charge year");
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < 1 || input.periodMonth > 12) {
    throw new Error("Invalid charge month");
  }

  const [tenant] = await db
    .select({tariffPerSqm: tenants.tariffPerSqm, dueDay: tenants.dueDay})
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found");

  const tariff = Number(tenant.tariffPerSqm);
  if (!Number.isFinite(tariff) || tariff <= 0) throw new Error("Tariff is not configured");

  const unitList = await db
    .select({
      unitId: units.id,
      area: units.area,
      ownerId: ownerships.ownerId,
    })
    .from(units)
    .leftJoin(ownerships, and(
      eq(ownerships.unitId, units.id),
      eq(ownerships.tenantId, tenantId),
      eq(ownerships.isPrimary, true),
    ))
    .where(eq(units.tenantId, tenantId));

  const dueDate = dueDateFor(input.periodYear, input.periodMonth, tenant.dueDay);
  const chargeValues = unitList
    .filter((unit): unit is typeof unit & {ownerId: string} => unit.ownerId !== null)
    .map((unit) => ({
      tenantId,
      unitId: unit.unitId,
      ownerId: unit.ownerId,
      amount: (Math.round(Number(unit.area) * tariff * 100) / 100).toFixed(2),
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      dueDate,
      status: "pending" as const,
      createdBy: userId,
    }));

  if (chargeValues.length === 0) return [];

  const created = await db
    .insert(charges)
    .values(chargeValues)
    .onConflictDoNothing()
    .returning();

  if (created.length === 0) return [];

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "charge",
    entityId: created[0]!.id,
    newValues: {count: created.length, period: `${input.periodYear}-${input.periodMonth}`, tariff},
  });

  return created;
}

export async function listCharges(tenantId: string, periodYear?: number, periodMonth?: number) {
  const conditions = [eq(charges.tenantId, tenantId)];

  if (periodYear) conditions.push(eq(charges.periodYear, periodYear));
  if (periodMonth) conditions.push(eq(charges.periodMonth, periodMonth));

  return await db
    .select()
    .from(charges)
    .where(and(...conditions))
    .orderBy(charges.dueDate)
    .limit(500);
}

export type OwnerCharge = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: "pending" | "paid" | "partially_paid" | "overdue" | "cancelled";
  unitNumber: string | null;
};

/** Latest apartment charges for one owner. */
export async function listChargesForOwner(tenantId: string, ownerId: string, limit = 6): Promise<OwnerCharge[]> {
  return await db
    .select({
      id: charges.id,
      amount: charges.amount,
      periodYear: charges.periodYear,
      periodMonth: charges.periodMonth,
      dueDate: charges.dueDate,
      status: charges.status,
      unitNumber: units.unitNumber,
    })
    .from(charges)
    .leftJoin(units, and(eq(units.id, charges.unitId), eq(units.tenantId, tenantId)))
    .where(and(eq(charges.tenantId, tenantId), eq(charges.ownerId, ownerId)))
    .orderBy(desc(charges.periodYear), desc(charges.periodMonth))
    .limit(limit);
}
