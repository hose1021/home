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
import {PayButton} from "./pay-button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TARIFF_RATE = Number(process.env.NEXT_PUBLIC_TARIFF_RATE ?? "0.40");

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];


export default async function OwnerDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; ownerId: string }>;
}) {
  const { tenantSlug, ownerId } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

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
    .orderBy(units.unitNumber);

  const unitIds = ownerUnits.map((u) => u.id);
  const paymentsPerUnit = unitIds.length > 0
    ? await db
        .select({
          unitId: payments.unitId,
          periodYear: payments.periodYear,
          periodMonth: payments.periodMonth,
          totalPaid: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
        })
        .from(payments)
        .where(and(
          eq(payments.ownerId, owner.id),
          eq(payments.tenantId, tenantId),
          eq(payments.status, "confirmed"),
        ))
        .groupBy(payments.unitId, payments.periodYear, payments.periodMonth)
    : [];

  // Group payments per unit: unitId → [{year, month, paid}, ...]
  const paymentsByUnit = new Map<string, { year: number; month: number; paid: number }[]>();
  for (const p of paymentsPerUnit) {
    const arr = paymentsByUnit.get(p.unitId) ?? [];
    arr.push({ year: p.periodYear, month: p.periodMonth, paid: Number(p.totalPaid) });
    paymentsByUnit.set(p.unitId, arr);
  }

  return (
    <div className="space-y-6">
      <div>
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
      </div>

      <div className="space-y-3">
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-4 font-semibold">Личная информация</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label="ФИО" value={owner.fullName} />
            <InfoRow label="Телефон" value={owner.phone} />
            <InfoRow label="Логин" value={owner.username} />
            <InfoRow label="Статус" value={owner.status} />
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Собственность и оплата</h2>
          {ownerUnits.length > 0 ? (
            <div className="lg:flex space-y-3 lg:space-x-3">
              {ownerUnits.map((unit) => {
                const area = Number(unit.area);
                const monthlyFee = area * TARIFF_RATE;
                const debts = paymentsByUnit.get(unit.id) ?? [];
                const totalPaid = debts.reduce((s, d) => s + d.paid, 0);

                return (
                  <div key={unit.id} className="rounded-lg w-full bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="font-medium">Квартира №{unit.unitNumber}</span>
                        <span className="ml-2 text-zinc-400">{area.toFixed(1)} м²</span>
                        <span className="ml-2 text-sm text-zinc-400">Под. {unit.entrance}, эт. {unit.floor}</span>
                      </div>
                      <span className="text-sm text-zinc-500">Тариф: {TARIFF_RATE.toFixed(2)} ₼/м² · {monthlyFee.toFixed(2)} ₼/мес</span>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <div className="w-full">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-zinc-400">
                              <th className="pb-1 text-left font-medium">Месяц</th>
                              <th className="pb-1 text-right font-medium">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debts.map((d) => (
                              <tr key={`${d.year}-${d.month}`}>
                                <td className="py-0.5 text-zinc-400">{MONTH_NAMES[d.month - 1]} {d.year}</td>
                                <td className={`py-0.5 text-right ${d.paid >= monthlyFee ? "text-green-600" : "text-amber-600"}`}>
                                  {d.paid.toFixed(2)} ₼ {d.paid >= monthlyFee ? "✓" : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-zinc-200 text-zinc-500 dark:border-zinc-700">
                              <td className="pt-1 font-medium">Оплачено всего</td>
                              <td className="pt-1 text-right font-medium text-green-600">{totalPaid.toFixed(2)} ₼</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                      <div className="flex mt-4 items-end">
                          <PayButton
                              slug={tenantSlug}
                              ownerId={owner.id}
                              unitId={unit.id}
                              unitNumber={unit.unitNumber}
                              monthlyFee={monthlyFee}
                              debts={debts}
                          />
                      </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Квартиры не привязаны</p>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
