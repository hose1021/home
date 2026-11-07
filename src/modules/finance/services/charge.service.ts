import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {BILLING, type ChargeStatus} from "@/core/db/schema/enums";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {DomainError} from "@/core/errors/app-error";
import {periodKey} from "@/modules/finance/period";
import {moneyToCents} from "./money";
import {getFinancialSettings} from "./settings.service";

type GenerateChargesInput = {
  periodYear: number;
  periodMonth: number;
};

function dueDateFor(periodYear: number, periodMonth: number, dueDay: number): string {
  const lastDay = new Date(periodYear, periodMonth, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), lastDay);
  return `${periodKey(periodYear, periodMonth)}-${String(day).padStart(2, "0")}`;
}

/**
 * One apartment charge per period: area × tenant tariff. The building pays services from the
 * collected money, so no other charge source exists.
 */
export async function generateMonthlyCharges(tenantId: string, input: GenerateChargesInput, userId: string) {
  if (!Number.isInteger(input.periodYear) || input.periodYear < BILLING.minYear || input.periodYear > BILLING.maxYear) {
    throw new DomainError("invalidChargeYear");
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < BILLING.minMonth || input.periodMonth > BILLING.maxMonth) {
    throw new DomainError("invalidChargeMonth");
  }

  const settings = await getFinancialSettings(tenantId);
  if (!Number.isFinite(settings.tariffPerSqm) || settings.tariffPerSqm <= 0) {
    throw new DomainError("invalidTariff");
  }

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

  const dueDate = dueDateFor(input.periodYear, input.periodMonth, settings.dueDay);
  const chargeValues = unitList
    .filter((unit): unit is typeof unit & {ownerId: string} => unit.ownerId !== null)
    .map((unit) => ({
      tenantId,
      unitId: unit.unitId,
      ownerId: unit.ownerId,
      amount: (moneyToCents(Number(unit.area) * settings.tariffPerSqm) / 100).toFixed(2),
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
    newValues: {count: created.length, period: periodKey(input.periodYear, input.periodMonth), tariff: settings.tariffPerSqm},
  });

  return created;
}

export type OwnerCharge = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: ChargeStatus;
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

export type PayableUnit = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  ownerName: string | null;
  ownerId: string;
};

/** Active units with their primary owner, for the payment form. */
export async function listPayableUnits(tenantId: string): Promise<PayableUnit[]> {
  const rows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
      ownerId: owners.id,
    })
    .from(units)
    .leftJoin(ownerships, and(eq(ownerships.unitId, units.id), eq(ownerships.tenantId, tenantId), eq(ownerships.isPrimary, true)))
    .leftJoin(owners, and(eq(owners.id, ownerships.ownerId), eq(owners.tenantId, tenantId)))
    .where(and(eq(units.tenantId, tenantId), eq(units.status, "active")))
    .orderBy(units.entrance, units.floor, units.unitNumber);

  return rows.filter((unit): unit is PayableUnit => unit.ownerId !== null);
}
