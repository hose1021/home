import {db} from "@/core/db";
import {charges, chargeTemplates} from "@/core/db/schema/charges";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {and, eq, inArray} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";

type GenerateChargesInput = {
  templateId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
};

export async function generateMonthlyCharges(tenantId: string, input: GenerateChargesInput, userId: string) {
  if (!Number.isInteger(input.periodYear) || input.periodYear < 2000 || input.periodYear > 2200) {
    throw new Error("Invalid charge year");
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < 1 || input.periodMonth > 12) {
    throw new Error("Invalid charge month");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || Number.isNaN(Date.parse(input.dueDate))) {
    throw new Error("Invalid due date");
  }

  const [template] = await db
    .select()
    .from(chargeTemplates)
    .where(and(eq(chargeTemplates.id, input.templateId), eq(chargeTemplates.tenantId, tenantId)))
    .limit(1);

  if (!template) throw new Error("Charge template not found");

  const unitList = await db
    .select({
      unitId: units.id,
      ownerId: ownerships.ownerId,
    })
    .from(units)
    .leftJoin(ownerships, and(
      eq(ownerships.unitId, units.id),
      eq(ownerships.isPrimary, true),
    ))
    .where(eq(units.tenantId, tenantId));

  const existingUnitIds = unitList.length > 0
    ? await db
        .select({unitId: charges.unitId})
        .from(charges)
        .where(and(
          eq(charges.tenantId, tenantId),
          eq(charges.templateId, template.id),
          eq(charges.periodYear, input.periodYear),
          eq(charges.periodMonth, input.periodMonth),
          inArray(charges.unitId, unitList.map((unit) => unit.unitId)),
        ))
    : [];
  const existingUnits = new Set(existingUnitIds.map((row) => row.unitId));

  const chargeValues = unitList
    .filter((u): u is typeof u & { ownerId: string } => u.ownerId !== null)
    .filter((u) => !existingUnits.has(u.unitId))
    .map((u) => {
      return {
        tenantId,
        templateId: template.id,
        unitId: u.unitId,
        ownerId: u.ownerId,
        amount: template.amount,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        dueDate: input.dueDate,
        status: "pending" as const,
        createdBy: userId,
      };
    });

  if (chargeValues.length === 0) return [];

  const created = await db.insert(charges).values(chargeValues).returning();

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "charge",
    entityId: created[0]?.id ?? "batch",
    newValues: { count: created.length, period: `${input.periodYear}-${input.periodMonth}` },
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
    .orderBy(charges.dueDate);
}

export async function listChargesWithDetails(tenantId: string, filter?: {
  periodYear?: number;
  periodMonth?: number;
  status?: string;
}) {
  const conditions = [eq(charges.tenantId, tenantId)];
  if (filter?.periodYear) conditions.push(eq(charges.periodYear, filter.periodYear));
  if (filter?.periodMonth) conditions.push(eq(charges.periodMonth, filter.periodMonth));
  if (filter?.status) conditions.push(eq(charges.status, filter.status as "pending" | "paid" | "partially_paid" | "overdue" | "cancelled"));

  return await db
    .select({
      id: charges.id,
      amount: charges.amount,
      periodYear: charges.periodYear,
      periodMonth: charges.periodMonth,
      dueDate: charges.dueDate,
      status: charges.status,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
      templateName: chargeTemplates.name,
    })
    .from(charges)
    .leftJoin(units, eq(units.id, charges.unitId))
    .leftJoin(owners, eq(owners.id, charges.ownerId))
    .leftJoin(chargeTemplates, eq(chargeTemplates.id, charges.templateId))
    .where(and(...conditions))
    .orderBy(charges.dueDate);
}

export async function listChargeTemplates(tenantId: string) {
  return await db
    .select()
    .from(chargeTemplates)
    .where(and(eq(chargeTemplates.tenantId, tenantId), eq(chargeTemplates.isActive, true)));
}
