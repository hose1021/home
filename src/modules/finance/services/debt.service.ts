import {and, eq, inArray, sql} from "drizzle-orm";
import {getBillingStartDate, getTariffPerSqm} from "@/core/config";
import {db} from "@/core/db";
import {ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";

export type BillingPeriod = {year: number; month: number};

export type DebtConfig = {
  tariffPerSqm: number;
  billingStart: string; // "YYYY-MM"
};

export type TenantDebtSummary = {totalDebt: number};

export type OwnerDebtStatus = {hasDebt: boolean; hasPaidThisPeriod: boolean};

/** Canonical debt semantics (AGENTS.md): tariff × area per period from billing start − confirmed payments, clamped at 0 per period. */
export function getDebtConfig(): DebtConfig {
  return {tariffPerSqm: getTariffPerSqm(), billingStart: getBillingStartDate()};
}

/** Enumerate billing periods from billing start through `now`'s month. Pure. */
export function buildPeriods(billingStart: string, now: Date = new Date()): BillingPeriod[] {
  const [startYearRaw, startMonthRaw] = billingStart.split("-").map(Number);
  const startYear = startYearRaw !== undefined && Number.isFinite(startYearRaw) ? startYearRaw : now.getFullYear();
  const startMonth = startMonthRaw !== undefined && Number.isFinite(startMonthRaw) ? Math.min(Math.max(startMonthRaw, 1), 12) : 1;
  const periods: BillingPeriod[] = [];
  for (let y = startYear; y <= now.getFullYear(); y++) {
    const mFrom = y === startYear ? startMonth : 1;
    const mTo = y === now.getFullYear() ? now.getMonth() + 1 : 12;
    for (let m = mFrom; m <= mTo; m++) periods.push({year: y, month: m});
  }
  return periods;
}

/** Debt for one unit over all periods: Σ max(0, fee − paid). Overpayment never offsets another period. Pure. */
export function unitDebt(monthlyFee: number, periods: BillingPeriod[], paidFor: (p: BillingPeriod) => number): number {
  let debt = 0;
  for (const p of periods) debt += Math.max(0, monthlyFee - paidFor(p));
  return debt;
}

const paidAgg = sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`;

async function paidByUnitPeriod(tenantId: string, unitIds: string[]) {
  const rows = unitIds.length === 0 ? [] : await db
    .select({
      unitId: payments.unitId,
      periodYear: payments.periodYear,
      periodMonth: payments.periodMonth,
      paid: paidAgg,
    })
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      eq(payments.status, "confirmed"),
      inArray(payments.unitId, unitIds),
    ))
    .groupBy(payments.unitId, payments.periodYear, payments.periodMonth);

  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.unitId) ?? new Map<string, number>();
    inner.set(`${r.periodYear}-${r.periodMonth}`, Number(r.paid));
    map.set(r.unitId, inner);
  }
  return map;
}

async function activeOwnedUnits(tenantId: string): Promise<{unitId: string; area: string}[]> {
  return db
    .select({unitId: units.id, area: units.area})
    .from(units)
    .innerJoin(ownerships, eq(ownerships.unitId, units.id))
    .where(and(eq(ownerships.tenantId, tenantId), eq(units.status, "active")));
}

/** Tenant-wide outstanding debt across all owned units, canonical formula. */
export async function getTenantDebtSummary(tenantId: string): Promise<TenantDebtSummary> {
  const cfg = getDebtConfig();
  const periods = buildPeriods(cfg.billingStart);
  if (periods.length === 0) return {totalDebt: 0};

  const unitRows = await activeOwnedUnits(tenantId);
  if (unitRows.length === 0) return {totalDebt: 0};
  const paid = await paidByUnitPeriod(tenantId, unitRows.map((u) => u.unitId));

  let total = 0;
  for (const u of unitRows) {
    total += unitDebt(Number(u.area) * cfg.tariffPerSqm, periods, (p) =>
      paid.get(u.unitId)?.get(`${p.year}-${p.month}`) ?? 0);
  }
  return {totalDebt: Math.round(total * 100) / 100};
}

/** Per-owner flags for the registry: hasDebt (canonical), hasPaidThisPeriod (every owned unit fully paid this month). */
export async function getOwnersDebtStatus(tenantId: string): Promise<Map<string, OwnerDebtStatus>> {
  const cfg = getDebtConfig();
  const periods = buildPeriods(cfg.billingStart);
  const current = periods[periods.length - 1];
  const out = new Map<string, OwnerDebtStatus>();
  if (!current) return out;

  const rows = await db
    .select({ownerId: ownerships.ownerId, unitId: units.id, area: units.area})
    .from(ownerships)
    .innerJoin(units, eq(units.id, ownerships.unitId))
    .where(and(eq(ownerships.tenantId, tenantId), eq(units.status, "active")));
  if (rows.length === 0) return out;

  const paid = await paidByUnitPeriod(tenantId, [...new Set(rows.map((r) => r.unitId))]);

  for (const row of rows) {
    const entry = out.get(row.ownerId) ?? {hasDebt: false, hasPaidThisPeriod: true};
    const monthlyFee = Number(row.area) * cfg.tariffPerSqm;
    const getPaid = (p: BillingPeriod) => paid.get(row.unitId)?.get(`${p.year}-${p.month}`) ?? 0;
    if (unitDebt(monthlyFee, periods, getPaid) > 0) entry.hasDebt = true;
    if (getPaid(current) < monthlyFee) entry.hasPaidThisPeriod = false;
    out.set(row.ownerId, entry);
  }
  return out;
}
