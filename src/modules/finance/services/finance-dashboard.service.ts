import {and, eq, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {payments} from "@/core/db/schema/payments";
import {funds} from "@/core/db/schema/funds";
import {units} from "@/core/db/schema/units";
import {owners, ownerships} from "@/core/db/schema/owners";
import {listChargesWithDetails, listChargeTemplates} from "./charge.service";
import {listPaymentsWithDetails} from "./payment.service";
import {getTenantDebtSummary} from "./debt.service";

export type DashboardChargeRow = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
  templateName: string | null;
};

export type DashboardPaymentRow = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNo: string | null;
  status: string;
  notes: string | null;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
};

export type DashboardFund = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  targetAmount: string | null;
  currentBalance: string;
};

export type DashboardTemplate = {id: string; name: string; amount: string};

export type DashboardUnit = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  ownerName: string | null;
  ownerId: string | null;
};

export type FinanceDashboardSummary = {
  totalCharged: string;
  totalPaid: string;
  totalDebt: string;
  fundCount: number;
};

export type FinanceDashboardData = {
  summary: FinanceDashboardSummary;
  charges: DashboardChargeRow[];
  payments: DashboardPaymentRow[];
  funds: DashboardFund[];
  templates: DashboardTemplate[];
  units: DashboardUnit[];
};

/** Keep only units whose primary owner resolved (left join found an owner). Pure. */
export function filterUnitsWithOwners<T extends {ownerId: string | null}>(rows: readonly T[]): Array<T & {ownerId: string}> {
  return rows.filter((u): u is T & {ownerId: string} => u.ownerId !== null);
}

/** Remap raw totals + debt + fund count into view-ready summary strings. Pure. */
export function buildSummary(input: {
  chargeTotal?: string;
  paymentTotal?: string;
  totalDebt: number;
  fundCount: number;
}): FinanceDashboardSummary {
  return {
    totalCharged: input.chargeTotal ?? "0",
    totalPaid: input.paymentTotal ?? "0",
    totalDebt: input.totalDebt.toFixed(2),
    fundCount: input.fundCount,
  };
}

export async function getFinanceDashboard(tenantId: string): Promise<FinanceDashboardData> {
  const [[chargeTotal], [paymentTotal], {totalDebt}, fundList, chargeRows, paymentRows, templates, unitRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
      .from(charges)
      .where(eq(charges.tenantId, tenantId)),
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)` })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed"))),
    getTenantDebtSummary(tenantId),
    db.select().from(funds).where(eq(funds.tenantId, tenantId)),
    listChargesWithDetails(tenantId),
    listPaymentsWithDetails(tenantId, 50),
    listChargeTemplates(tenantId),
    db
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
      .orderBy(units.entrance, units.floor, units.unitNumber),
  ]);

  return {
    summary: buildSummary({
      chargeTotal: chargeTotal?.total,
      paymentTotal: paymentTotal?.total,
      totalDebt,
      fundCount: fundList.length,
    }),
    charges: chargeRows.map((c) => ({
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
    })),
    payments: paymentRows.map((p) => ({
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
    })),
    funds: fundList.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      description: f.description,
      targetAmount: f.targetAmount,
      currentBalance: f.currentBalance,
    })),
    templates: templates.map((t) => ({id: t.id, name: t.name, amount: t.amount})),
    units: filterUnitsWithOwners(unitRows).map((u) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      entrance: u.entrance,
      floor: u.floor,
      ownerName: u.ownerName,
      ownerId: u.ownerId,
    })),
  };
}
