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
import {PayButton} from "./pay-button";
import {PaymentHistory} from "./payment-history";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const MONTHS = [
  "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const TARIFF = Number(process.env.MONTHLY_TARIFF_PER_SQM ?? "0.40");

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const startDate = process.env.BILLING_START_DATE ?? "2025-01";
const [startYear, startMonthRaw] = startDate.split("-").map(Number);
const startMonth = startMonthRaw ?? 1;

type PeriodRow = {
  year: number;
  month: number;
  charged: number;
  paid: number;
};

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

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader><CardTitle>Личная информация</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <InfoRow label="ФИО" value={owner.fullName} />
              <InfoRow label="Телефон" value={owner.phone} />
              <InfoRow label="Логин" value={owner.username} />
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <dt className="text-zinc-500">Статус</dt>
                <dd><Badge variant={owner.status === "active" ? "default" : "secondary"}>{owner.status === "active" ? "Активен" : owner.status}</Badge></dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900 space-y-1">
              <div className="flex justify-between"><span className="text-zinc-500">Тариф:</span><span className="font-medium">{TARIFF.toFixed(2)} ₼/м²</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Начало начисления:</span><span className="font-medium">{MONTHS[startMonth]} {startYear}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {ownerUnits.length > 0 ? (
            ownerUnits.map((unit) => {
              const area = Number(unit.area);
              const monthlyFee = area * TARIFF;

              const allPeriods: PeriodRow[] = [];
              for (const { year, month } of buildAllPeriods()) {
                const paid = paymentsByUnit.get(unit.id)?.get(`${year}-${month}`) ?? 0;
                allPeriods.push({ year, month, charged: monthlyFee, paid });
              }

              const totalCharged = allPeriods.reduce((s, p) => s + p.charged, 0);
              const totalPaid = allPeriods.reduce((s, p) => s + p.paid, 0);
              const totalDebt = Math.max(0, totalCharged - totalPaid);

              return (
                <Card key={unit.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base">
                        Кв. {unit.unitNumber}
                        <span className="ml-2 text-sm font-normal text-zinc-400">
                          Блок {unit.entrance}, эт. {unit.floor}, {area.toFixed(1)} м²
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-sm text-zinc-500">
                          Долг: <span className="font-bold text-red-600">{totalDebt.toFixed(2)} ₼</span>
                        </span>
                        {canPay && (
                          <PayButton
                            slug={tenantSlug}
                            ownerId={owner.id}
                            unitId={unit.id}
                            unitNumber={unit.unitNumber}
                            entrance={unit.entrance}
                            floor={unit.floor}
                            monthlyFee={monthlyFee}
                            tariff={TARIFF}
                            periods={allPeriods}
                          />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Период</TableHead>
                            <TableHead className="text-right">Начислено</TableHead>
                            <TableHead className="text-right">Оплачено</TableHead>
                            <TableHead className="text-right">Долг</TableHead>
                            <TableHead className="min-w-[90px]">Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPeriods.map((p) => {
                            const debt = Math.max(0, p.charged - p.paid);
                            const isPaid = p.paid >= p.charged;
                            return (
                              <TableRow key={`${p.year}-${p.month}`}>
                                <TableCell className="text-sm whitespace-nowrap">{MONTHS[p.month]} {p.year}</TableCell>
                                <TableCell className="text-right text-sm">{p.charged.toFixed(2)} ₼</TableCell>
                                <TableCell className="text-right text-sm font-medium text-green-600">{p.paid.toFixed(2)} ₼</TableCell>
                                <TableCell className={`text-right text-sm whitespace-nowrap ${debt > 0 ? "text-red-600 font-medium" : "text-zinc-400"}`}>{debt.toFixed(2)} ₼</TableCell>
                                <TableCell>
                                  <Badge className={`whitespace-nowrap ${
                                    isPaid
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                  }`}>
                                    {isPaid ? "Оплачено" : "Долг"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:justify-between text-sm">
                      <span className="text-zinc-500">Всего начислено: <span className="font-medium text-zinc-700 dark:text-zinc-300">{totalCharged.toFixed(2)} ₼</span></span>
                      <span className="text-zinc-500">Всего оплачено: <span className="font-medium text-green-600">{totalPaid.toFixed(2)} ₼</span></span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent><p className="text-sm text-zinc-400 py-8 text-center">Квартиры не привязаны</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {paymentList.length > 0 && (
        <Card>
          <CardHeader><CardTitle>История платежей</CardTitle></CardHeader>
          <CardContent>
            <PaymentHistory
              slug={tenantSlug}
              ownerId={owner.id}
              canEdit={canPay}
              payments={paymentList}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
