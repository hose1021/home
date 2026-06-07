import { ensureTenantExists } from "@/core/multi-tenant";
import { db } from "@/core/db";
import { owners } from "@/core/db/schema/owners";
import { ownerships } from "@/core/db/schema/owners";
import { units } from "@/core/db/schema/units";
import { users, userRoles } from "@/core/db/schema/users";
import { eq, sql } from "drizzle-orm";
import { OwnerTable } from "./owner-table";

export default async function OwnersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

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
    .where(eq(owners.tenantId, tenantId))
    .groupBy(owners.id, owners.userId, users.id, userRoles.role)
    .orderBy(owners.fullName);

  const grouped = rows.reduce<Record<string, { id: string; userId: string | null; fullName: string; phone: string | null; username: string; roles: string[]; unitNumbers: string[]; unitCount: number }>>((acc, row) => {
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
      <OwnerTable slug={tenantSlug} owners={ownersWithRoles} />
    </div>
  );
}
