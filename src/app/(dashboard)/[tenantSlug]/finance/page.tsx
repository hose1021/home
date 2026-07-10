import {ensureTenantExists} from "@/core/multi-tenant";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {payments} from "@/core/db/schema/payments";
import {funds} from "@/core/db/schema/funds";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {and, eq, sql} from "drizzle-orm";
import {getSession} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {FinanceDashboard} from "@/modules/finance/components/FinanceDashboard";
import {listChargesWithDetails, listChargeTemplates} from "@/modules/finance/services/charge.service";
import {listPaymentsWithDetails} from "@/modules/finance/services/payment.service";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);
  const session = await getSession();
  const permissions: Permission[] = session ? getPermissionsForRoles(session.user.roles) : [];

  const [chargeTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
    .from(charges)
    .where(eq(charges.tenantId, tenantId));

  const [paymentTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const [debtTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
    .from(charges)
    .where(and(eq(charges.tenantId, tenantId), eq(charges.status, "pending")));

  const fundList = await db.select().from(funds).where(eq(funds.tenantId, tenantId));
  const chargeRows = await listChargesWithDetails(tenantId);
  const paymentRows = await listPaymentsWithDetails(tenantId, 50);
  const templates = await listChargeTemplates(tenantId);

  const unitRows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
      ownerId: owners.id,
    })
    .from(units)
    .leftJoin(ownerships, and(eq(ownerships.unitId, units.id), eq(ownerships.isPrimary, true)))
    .leftJoin(owners, eq(owners.id, ownerships.ownerId))
    .where(and(eq(units.tenantId, tenantId), eq(units.status, "active")))
    .orderBy(units.entrance, units.floor, units.unitNumber);

  const unitsWithOwners = unitRows.filter((u) => u.ownerId !== null) as typeof unitRows;

  return (
    <FinanceDashboard
      slug={tenantSlug}
      summary={{
        totalCharged: chargeTotal?.total ?? "0",
        totalPaid: paymentTotal?.total ?? "0",
        totalDebt: debtTotal?.total ?? "0",
        fundCount: fundList.length,
      }}
      charges={chargeRows.map((c) => ({
        id: c.id,
        amount: c.amount,
        periodYear: c.periodYear,
        periodMonth: c.periodMonth,
        dueDate: c.dueDate,
        status: c.status,
        unitNumber: c.unitNumber,
        entrance: c.entrance,
        floor: c.floor,
        ownerName: c.ownerName,
        templateName: c.templateName,
      }))}
      payments={paymentRows.map((p) => ({
        id: p.id,
        amount: p.amount,
        periodYear: p.periodYear,
        periodMonth: p.periodMonth,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNo: p.referenceNo,
        status: p.status,
        notes: p.notes,
        unitNumber: p.unitNumber,
        entrance: p.entrance,
        floor: p.floor,
        ownerName: p.ownerName,
      }))}
      funds={fundList.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        description: f.description,
        targetAmount: f.targetAmount,
        currentBalance: f.currentBalance,
      }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name, amount: t.amount }))}
      units={unitsWithOwners.map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        entrance: u.entrance,
        floor: u.floor,
        ownerName: u.ownerName,
        ownerId: u.ownerId,
      }))}
      canGenerateCharges={permissions.includes("charge:write")}
      canRegisterPayments={permissions.includes("payment:write")}
      canManageFunds={permissions.includes("fund:write")}
    />
  );
}
