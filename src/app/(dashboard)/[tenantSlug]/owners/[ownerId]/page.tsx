import Link from "next/link";
import {notFound} from "next/navigation";
import {and, eq, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {buildings} from "@/core/db/schema/buildings";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {payments} from "@/core/db/schema/payments";
import {users} from "@/core/db/schema/users";
import {ensureTenantExists} from "@/core/multi-tenant";
import {getSession} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {MonthRow, type MonthPayment} from "./month-row";
import {PaymentHistory} from "./payment-history";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TARIFF = Number(process.env.MONTHLY_TARIFF_PER_SQM ?? "0.40");

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const startDate = process.env.BILLING_START_DATE ?? "2025-01";
const [startYear, startMonthRaw] = startDate.split("-").map(Number);
const startMonth = startMonthRaw ?? 1;

function buildAllPeriods(): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const minM = y === startYear ? startMonth : 1;
    const maxM = y === currentYear ? currentMonth : 12;
    for (let m = minM; m <= maxM; m++) out.push({ year: y, month: m });
  }
  return out;
}

export default async function OwnerDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; ownerId: string }>;
}) {
  const { tenantSlug, ownerId } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);
  const session = await getSession();
  const permissions: Permission[] = session ? getPermissionsForRoles(session.user.roles) : [];
  const canPay = permissions.includes("payment:write");

  const [owner] = await db
    .select({
      id: owners.id,
      fullName: users.fullName,
      phone: users.phone,
      username: users.username,
      status: owners.status,
    })
    .from(owners)
    .innerJoin(users, eq(users.id, owners.userId))
    .where(and(eq(owners.id, ownerId), eq(owners.tenantId, tenantId)))
    .limit(1);

  if (!owner) notFound();

  const ownerUnits = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      area: units.area,
      entrance: units.entrance,
      floor: units.floor,
      type: units.type,
      buildingName: buildings.name,
    })
    .from(ownerships)
    .innerJoin(units, eq(units.id, ownerships.unitId))
    .innerJoin(buildings, eq(buildings.id, units.buildingId))
    .where(and(
      eq(ownerships.ownerId, owner.id),
      eq(ownerships.tenantId, tenantId),
    ))
    .orderBy(units.entrance, units.floor, units.unitNumber);

  const unitIds = ownerUnits.map((u) => u.id);

  const [paymentAgg, paymentList] = unitIds.length > 0
    ? await Promise.all([
        db
          .select({
            unitId: payments.unitId,
            periodYear: payments.periodYear,
            periodMonth: payments.periodMonth,
            paid: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
          })
          .from(payments)
          .where(and(
            eq(payments.ownerId, owner.id),
            eq(payments.tenantId, tenantId),
            eq(payments.status, "confirmed"),
          ))
          .groupBy(payments.unitId, payments.periodYear, payments.periodMonth),
        db
          .select({
            id: payments.id,
            amount: payments.amount,
            tariffPerSqm: payments.tariffPerSqm,
            periodYear: payments.periodYear,
            periodMonth: payments.periodMonth,
            paymentMethod: payments.paymentMethod,
            referenceNo: payments.referenceNo,
            notes: payments.notes,
            paymentDate: payments.paymentDate,
            unitId: payments.unitId,
            unitNumber: units.unitNumber,
            entrance: units.entrance,
            floor: units.floor,
          })
          .from(payments)
          .innerJoin(units, eq(units.id, payments.unitId))
          .where(and(
            eq(payments.ownerId, owner.id),
            eq(payments.tenantId, tenantId),
          ))
          .orderBy(sql`${payments.paymentDate} DESC`),
      ])
    : [[], []];

  const paymentsByUnit = new Map<string, Map<string, number>>();
  for (const p of paymentAgg) {
    const inner = paymentsByUnit.get(p.unitId) ?? new Map<string, number>();
    inner.set(`${p.periodYear}-${p.periodMonth}`, Number(p.paid));
    paymentsByUnit.set(p.unitId, inner);
  }

  const paymentByUnitPeriod = new Map<string, MonthPayment>();
  for (const p of paymentList) {
    paymentByUnitPeriod.set(`${p.unitId}-${p.periodYear}-${p.periodMonth}`, {
      id: p.id,
      amount: p.amount,
      tariffPerSqm: p.tariffPerSqm,
      paymentMethod: p.paymentMethod,
      referenceNo: p.referenceNo,
    });
  }

  const grandDebt = ownerUnits.reduce((sum, unit) => {
    const area = Number(unit.area);
    const monthlyFee = area * TARIFF;
    let debt = 0;
    for (const { year, month } of buildAllPeriods()) {
      const paid = paymentsByUnit.get(unit.id)?.get(`${year}-${month}`) ?? 0;
      debt += Math.max(0, monthlyFee - paid);
    }
    return sum + debt;
  }, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="" />} href={`/${tenantSlug}/owners`}>Собственники</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{owner.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{owner.fullName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {owner.phone ?? "нет телефона"}
          <span className="mx-2">·</span>
          {owner.username}
          {owner.status !== "active" && (
            <span className="ml-2 text-amber-600">неактивен</span>
          )}
        </p>
      </div>

      {grandDebt > 0 ? (
        <div className="rounded-xl bg-red-50 p-5 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400">Общий долг</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{grandDebt.toFixed(2)} ₼</p>
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 p-5 dark:bg-green-950/30">
          <p className="text-sm text-green-600 dark:text-green-400">Долгов нет</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">0.00 ₼</p>
        </div>
      )}

      {ownerUnits.length > 0 ? (
        <div className="space-y-4">
          {ownerUnits.map((unit) => {
            const area = Number(unit.area);
            const monthlyFee = area * TARIFF;
            const periods = buildAllPeriods();
            const totalDebt = periods.reduce((s, { year, month }) => {
              const paid = paymentsByUnit.get(unit.id)?.get(`${year}-${month}`) ?? 0;
              return s + Math.max(0, monthlyFee - paid);
            }, 0);

            const periodsByYear = new Map<number, { year: number; month: number }[]>();
            for (const p of periods) {
              const arr = periodsByYear.get(p.year) ?? [];
              arr.push(p);
              periodsByYear.set(p.year, arr);
            }

            return (
              <div key={unit.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Кв. {unit.unitNumber}</h2>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        Блок {unit.entrance}, эт. {unit.floor}, {area.toFixed(1)} м²
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {area.toFixed(1)} м² × {TARIFF.toFixed(2)} ₼ = {monthlyFee.toFixed(2)} ₼/мес
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">Долг</p>
                      <p className={`text-xl font-bold ${totalDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                        {totalDebt.toFixed(2)} ₼
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800">
                  {[...periodsByYear.entries()].reverse().map(([year, yearPeriods]) => (
                    <div key={year}>
                      <div className="bg-zinc-50 px-5 py-1.5 text-xs font-medium text-zinc-400 dark:bg-zinc-900/50">
                        {year}
                      </div>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {yearPeriods.map(({ year, month }) => {
                          const paid = paymentsByUnit.get(unit.id)?.get(`${year}-${month}`) ?? 0;
                          const isPaid = paid >= monthlyFee;
                          const payment = paymentByUnitPeriod.get(`${unit.id}-${year}-${month}`) ?? null;
                          return (
                            <MonthRow
                              key={`${year}-${month}`}
                              slug={tenantSlug}
                              ownerId={owner.id}
                              unitId={unit.id}
                              unitNumber={unit.unitNumber}
                              entrance={unit.entrance}
                              floor={unit.floor}
                              monthlyFee={monthlyFee}
                              tariff={TARIFF}
                              year={year}
                              month={month}
                              isPaid={isPaid}
                              alreadyPaid={paid}
                              payment={payment}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-zinc-400">Квартиры не привязаны</p>
        </div>
      )}

      {paymentList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">История платежей</h2>
          <PaymentHistory
            slug={tenantSlug}
            ownerId={owner.id}
            canEdit={canPay}
            payments={paymentList}
          />
        </div>
      )}
    </div>
  );
}
