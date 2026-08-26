import {and, eq, ne, sql} from "drizzle-orm";
import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, hasStaffRole, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {getOwnersDebtStatus} from "@/modules/finance/services/debt.service";
import {OwnerTable} from "./owner-table";

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; units?: string; payment?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations();
  const { session, tenantId } = await requireTenantPermission("owner:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const restrictToCurrentOwner = !hasStaffRole(session.user.roles);

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
    .where(and(
      eq(owners.tenantId, tenantId),
      ne(owners.status, "deleted"),
      restrictToCurrentOwner ? eq(owners.userId, session.user.id) : undefined,
    ))
    .groupBy(owners.id, owners.userId, users.id, userRoles.role)
    .orderBy(owners.fullName);

  const debtStatus = await getOwnersDebtStatus(tenantId);

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
      const status = debtStatus.get(row.id);
      acc[row.id] = {
        id: row.id,
        userId: row.userId,
        fullName: row.fullName,
        phone: row.phone,
        username: row.username,
        roles: [],
        unitNumbers: row.unitNumbers,
        unitCount: row.unitNumbers.length,
        hasDebt: status?.hasDebt ?? false,
        hasPaid: status?.hasPaidThisPeriod ?? false,
      };
    }
    if (row.role) acc[row.id]?.roles.push(row.role);
    return acc;
  }, {});

  const ownersWithRoles = Object.values(grouped);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("owners.registry")}</p>
          <h1 className="page-heading mt-1">{t("owners.title")}</h1>
          <p className="page-description">{t("owners.description")} · {ownersWithRoles.length} {t("common.people")}</p>
        </div>
      </div>
      <OwnerTable
        owners={ownersWithRoles}
        canManage={permissions.includes("owner:write")}
        canManageRoles={permissions.includes("user:manage")}
        initialSearch={sp.search}
        initialRole={sp.role}
        initialUnits={sp.units}
        initialPayment={sp.payment}
      />
    </div>
  );
}
