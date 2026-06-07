import {ensureTenantExists} from "@/core/multi-tenant";
import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {charges} from "@/core/db/schema/charges";
import {and, eq, inArray, ne, sql} from "drizzle-orm";
import {OwnerTable} from "./owner-table";

export default async function OwnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ search?: string; role?: string; units?: string; payment?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const tenantId = await ensureTenantExists(tenantSlug);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const rows = await db
    .select({
      id: owners.id,
      userId: owners.userId,
      fullName: users.fullName,
      phone: users.phone,
      username: users.username,
      role: userRoles.role,
      unitNumbers:
        sql<string[]>`coalesce(array_agg(distinct ${units.unitNumber}) filter (where ${units.unitNumber} is not null), '{}')`,
    })
    .from(owners)
    .innerJoin(users, eq(users.id, owners.userId))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(ownerships, eq(ownerships.ownerId, owners.id))
    .leftJoin(units, eq(units.id, ownerships.unitId))
    .where(and(eq(owners.tenantId, tenantId), ne(owners.status, "deleted")))
    .groupBy(owners.id, owners.userId, users.id, userRoles.role)
    .orderBy(owners.fullName);

  const ownerIds = [...new Set(rows.map((r) => r.id))];

  const [prevCharges, thisCharges] = ownerIds.length > 0
    ? await Promise.all([
        db
          .select({
            ownerId: charges.ownerId,
            status: charges.status,
          })
          .from(charges)
          .where(and(
            eq(charges.tenantId, tenantId),
            eq(charges.periodYear, prevYear),
            eq(charges.periodMonth, prevMonth),
            inArray(charges.ownerId, ownerIds),
          )),
        db
          .select({
            ownerId: charges.ownerId,
            status: charges.status,
          })
          .from(charges)
          .where(and(
            eq(charges.tenantId, tenantId),
            eq(charges.periodYear, currentYear),
            eq(charges.periodMonth, currentMonth),
            inArray(charges.ownerId, ownerIds),
          )),
      ])
    : [[], []];

  const notPaidPrev = new Set(
    prevCharges
      .filter((c) => c.status !== "paid")
      .map((c) => c.ownerId),
  );
  const paidThisMonth = new Set(
    thisCharges
      .filter((c) => c.status === "paid")
      .map((c) => c.ownerId),
  );

  const grouped = rows.reduce<Record<string, {
    id: string;
    userId: string | null;
    fullName: string;
    phone: string | null;
    username: string;
    roles: string[];
    unitNumbers: string[];
    unitCount: number;
    hasDebt: boolean;
    hasPaid: boolean;
  }>>((acc, row) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        id: row.id,
        userId: row.userId,
        fullName: row.fullName,
        phone: row.phone,
        username: row.username,
        roles: [],
        unitNumbers: row.unitNumbers,
        unitCount: row.unitNumbers.length,
        hasDebt: notPaidPrev.has(row.id),
        hasPaid: paidThisMonth.has(row.id),
      };
    }
    if (row.role) acc[row.id].roles.push(row.role);
    return acc;
  }, {});

  const ownersWithRoles = Object.values(grouped);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Собственники</h1>
          <p className="text-sm text-zinc-500">{ownersWithRoles.length} чел.</p>
        </div>
      </div>
      <OwnerTable
        slug={tenantSlug}
        owners={ownersWithRoles}
        initialSearch={sp.search}
        initialRole={sp.role}
        initialUnits={sp.units}
        initialPayment={sp.payment}
      />
    </div>
  );
}
