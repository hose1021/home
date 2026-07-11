import Link from "next/link";
import {notFound} from "next/navigation";
import {and, eq, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {buildings} from "@/core/db/schema/buildings";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {payments} from "@/core/db/schema/payments";
import {users} from "@/core/db/schema/users";
import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, hasStaffRole, type Permission} from "@/core/auth/permissions";
import {type MonthPayment, MonthRow} from "./month-row";
import {PaymentHistory} from "./payment-history";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent} from "@/components/ui/card";
import {IconBuilding, IconCash, IconHome, IconRulerMeasure} from "@tabler/icons-react";

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
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = await params;
  const { session, tenantId } = await requireTenantPermission("owner:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canPay = permissions.includes("payment:write");

  const [owner] = await db
    .select({
      id: owners.id,
      userId: owners.userId,
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
  const restrictToCurrentOwner = !hasStaffRole(session.user.roles);
  if (restrictToCurrentOwner && owner.userId !== session.user.id) notFound();

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
  const totalArea = ownerUnits.reduce((sum, unit) => sum + Number(unit.area), 0);
  const totalMonthlyFee = totalArea * TARIFF;
  const initials = owner.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="page-shell max-w-5xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="" />} href={`/owners`}>Собственники</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{owner.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="surface-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar size="lg" className="size-12">
            <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-heading truncate">{owner.fullName}</h1>
              <Badge variant={owner.status === "active" ? "secondary" : "outline"}>
                {owner.status === "active" ? "Активен" : "Неактивен"}
              </Badge>
            </div>
            <p className="page-description truncate">{owner.phone ?? "Нет телефона"} · {owner.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 sm:text-right">
          <IconCash className={grandDebt > 0 ? "size-5 text-destructive" : "size-5 text-emerald-600"} />
          <div>
            <p className="text-xs text-muted-foreground">Общий долг</p>
            <p className={`text-xl font-semibold tabular-nums ${grandDebt > 0 ? "text-destructive" : "text-emerald-600"}`}>{grandDebt.toFixed(2)} ₼</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OwnerMetric icon={IconHome} label="Квартиры" value={String(ownerUnits.length)} />
        <OwnerMetric icon={IconRulerMeasure} label="Общая площадь" value={`${totalArea.toFixed(1)} м²`} />
        <OwnerMetric icon={IconBuilding} label="Тариф в месяц" value={`${totalMonthlyFee.toFixed(2)} ₼`} />
      </div>

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
              <div key={unit.id} className="surface-panel overflow-hidden">
                <div className="bg-muted/20 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-background shadow-xs"><IconHome className="size-4" /></span><h2 className="text-lg font-semibold">Кв. {unit.unitNumber}</h2></div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Блок {unit.entrance}, эт. {unit.floor}, {area.toFixed(1)} м²
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {area.toFixed(1)} м² × {TARIFF.toFixed(2)} ₼ = {monthlyFee.toFixed(2)} ₼/мес
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Долг по квартире</p>
                      <p className={`mt-1 text-xl font-semibold tabular-nums ${totalDebt > 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {totalDebt.toFixed(2)} ₼
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t">
                  {[...periodsByYear.entries()].reverse().map(([year, yearPeriods]) => (
                    <div key={year}>
                      <div className="border-b bg-muted/40 px-5 py-2 text-xs font-semibold text-muted-foreground sm:px-6">
                        {year}
                      </div>
                      <div className="divide-y divide-border/70">
                        {yearPeriods.map(({ year, month }) => {
                          const paid = paymentsByUnit.get(unit.id)?.get(`${year}-${month}`) ?? 0;
                          const isPaid = paid >= monthlyFee;
                          const payment = paymentByUnitPeriod.get(`${unit.id}-${year}-${month}`) ?? null;
                          return (
                            <MonthRow
                              key={`${year}-${month}`}
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
        <div className="surface-panel border-dashed p-10 text-center">
          <p className="text-muted-foreground">Квартиры не привязаны</p>
        </div>
      )}

      {paymentList.length > 0 && (
        <div className="space-y-3">
          <div><h2 className="text-base font-semibold">История платежей</h2><p className="mt-1 text-sm text-muted-foreground">Последние зарегистрированные операции</p></div>
          <PaymentHistory
            ownerId={owner.id}
            canEdit={canPay}
            payments={paymentList}
          />
        </div>
      )}
    </div>
  );
}

function OwnerMetric({icon: Icon, label, value}: {icon: typeof IconHome; label: string; value: string}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card py-5">
      <CardContent className="flex items-center justify-between gap-4 px-5">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span>
      </CardContent>
    </Card>
  );
}
