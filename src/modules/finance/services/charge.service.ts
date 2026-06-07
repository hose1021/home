import { db } from "@/core/db";
import { charges, chargeTemplates } from "@/core/db/schema/charges";
import { units } from "@/core/db/schema/units";
import { ownerships } from "@/core/db/schema/owners";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/core/audit/audit.service";

type GenerateChargesInput = {
  templateId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
};

export async function generateMonthlyCharges(tenantId: string, input: GenerateChargesInput, userId: string) {
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

  const chargeValues = unitList
    .filter((u): u is typeof u & { ownerId: string } => u.ownerId !== null)
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
