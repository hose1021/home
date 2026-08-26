import {and, eq, notInArray, sql} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {assertValidUsername, hashPassword, normalizeUsername} from "@/core/auth/auth";
import type {Role} from "@/core/auth/permissions";
import {db} from "@/core/db";
import {buildings} from "@/core/db/schema/buildings";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {units} from "@/core/db/schema/units";
import {userRoles, users, sessions} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";
import {buildPeriods, getDebtConfig, unitDebt, type BillingPeriod} from "@/modules/finance/services/debt.service";

export async function getOwnerById(tenantId: string, id: string) {
  const [o] = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, id), eq(owners.tenantId, tenantId)))
    .limit(1);
  return o ?? null;
}

export type PaidPeriodRow = {
  unitId: string;
  periodYear: number;
  periodMonth: number;
  paid: string;
};

/** Confirmed payments per unit per "YYYY-M" period — the key scheme the owner detail view groups by. Pure. */
export function buildPaidByUnit(rows: PaidPeriodRow[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const inner = map.get(r.unitId) ?? new Map<string, number>();
    inner.set(`${r.periodYear}-${r.periodMonth}`, Number(r.paid));
    map.set(r.unitId, inner);
  }
  return map;
}

export type OwnerDetail = {
  owner: {
    id: string;
    userId: string;
    fullName: string;
    phone: string | null;
    username: string;
    status: string | null;
  };
  units: {
    id: string;
    unitNumber: string;
    area: string;
    entrance: number;
    floor: number;
    type: string;
    buildingName: string;
    monthlyFee: number;
    totalDebt: number;
  }[];
  grandDebt: number;
  totalArea: number;
  totalMonthlyFee: number;
  tariffPerSqm: number;
  periods: BillingPeriod[];
  paidByUnit: Map<string, Map<string, number>>;
  payments: {
    id: string;
    amount: string;
    tariffPerSqm: string;
    periodYear: number;
    periodMonth: number;
    paymentMethod: string;
    status: string;
    referenceNo: string | null;
    notes: string | null;
    paymentDate: Date;
    unitId: string;
    unitNumber: string;
    entrance: number;
    floor: number;
  }[];
};

/** The owner-detail read-model: owner, owned units, confirmed-paid map, full payment history. Null when the owner is not in the tenant. */
export async function getOwnerDetail(tenantId: string, ownerId: string): Promise<OwnerDetail | null> {
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
  if (!owner) return null;

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

  const [paidAgg, paymentList] = unitIds.length > 0
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
            status: payments.status,
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

  const cfg = getDebtConfig();
  const periods = buildPeriods(cfg.billingStart);
  const paidMap = buildPaidByUnit(paidAgg);
  const paidFor = (unitId: string, p: BillingPeriod) =>
    paidMap.get(unitId)?.get(`${p.year}-${p.month}`) ?? 0;

  let grandDebt = 0;
  let totalArea = 0;
  for (const u of ownerUnits) {
    const area = Number(u.area);
    totalArea += area;
    grandDebt += unitDebt(area * cfg.tariffPerSqm, periods, (p) => paidFor(u.id, p));
  }
  const unitsWithMoney = ownerUnits.map((u) => {
    const area = Number(u.area);
    const monthlyFee = area * cfg.tariffPerSqm;
    return {...u, monthlyFee, totalDebt: unitDebt(monthlyFee, periods, (p) => paidFor(u.id, p))};
  });

  return {
    owner,
    units: unitsWithMoney,
    grandDebt,
    totalArea,
    totalMonthlyFee: totalArea * cfg.tariffPerSqm,
    tariffPerSqm: cfg.tariffPerSqm,
    periods,
    paidByUnit: paidMap,
    payments: paymentList,
  };
}

export async function createOwnerWithUnit(tenantId: string, input: {
  fullName: string;
  phone?: string;
  username: string;
  password: string;
  unitNumber: string;
  floor: number;
  entrance: number;
  type: "residential" | "commercial" | "parking" | "storage" | "other";
  area: string;
}, userId: string) {
  const [building] = await db
    .select()
    .from(buildings)
    .where(eq(buildings.tenantId, tenantId))
    .limit(1);
  if (!building) throw new DomainError("building_not_found", "No building found");

  const username = normalizeUsername(input.username);
  assertValidUsername(username);
  const passwordHash = await hashPassword(input.password);

  const owner = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      tenantId,
      username,
      fullName: input.fullName,
      phone: input.phone ?? null,
      passwordHash,
    }).returning();
    if (!user) throw new Error("Failed to create user");

    const [unit] = await tx.insert(units).values({
      tenantId,
      buildingId: building.id,
      unitNumber: input.unitNumber,
      entrance: input.entrance,
      floor: input.floor,
      type: input.type,
      area: input.area,
    }).returning();
    if (!unit) throw new Error("Failed to create unit");

    const [createdOwner] = await tx.insert(owners).values({
      tenantId,
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
    }).returning();
    if (!createdOwner) throw new Error("Failed to create owner");

    await tx.insert(userRoles).values({
      userId: user.id,
      role: "owner",
      scopeTenantId: tenantId,
    });

    await tx.insert(ownerships).values({
      tenantId,
      ownerId: createdOwner.id,
      unitId: unit.id,
      registeredDate: new Date().toISOString().slice(0, 10),
      isPrimary: true,
    });

    return { owner: createdOwner, unit };
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "owner",
    entityId: owner.owner.id,
    newValues: { fullName: input.fullName, username, unitNumber: input.unitNumber, unitId: owner.unit.id },
  });

  return owner.owner;
}

export type ProfilePatch = { fullName?: string; phone?: string | null; username?: string };

/** Mirror fullName/phone (and optionally username) from a user row to its owner row atomically. Shared by owner and settings mutations. */
export async function syncUserOwnerProfile(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  input: ProfilePatch,
): Promise<void> {
  const userUpdate: Record<string, unknown> = {};
  if (input.fullName !== undefined) userUpdate.fullName = input.fullName;
  if (input.phone !== undefined) userUpdate.phone = input.phone;
  if (input.username !== undefined) {
    const u = normalizeUsername(input.username);
    assertValidUsername(u);
    userUpdate.username = u;
  }
  if (Object.keys(userUpdate).length > 0) {
    await tx.update(users).set(userUpdate).where(eq(users.id, userId));
  }

  const [owner] = await tx
    .select({id: owners.id})
    .from(owners)
    .where(and(eq(owners.userId, userId), notInArray(owners.status, ["deleted"])))
    .limit(1);
  if (!owner) return;

  const ownerUpdate: Record<string, unknown> = { updatedAt: new Date() };
  if (input.fullName !== undefined) ownerUpdate.fullName = input.fullName;
  if (input.phone !== undefined) ownerUpdate.phone = input.phone;
  await tx.update(owners).set(ownerUpdate).where(eq(owners.id, owner.id));
}

export async function updateOwnerWithRoles(tenantId: string, id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}, userId: string) {
  const [existingOwner] = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, id), eq(owners.tenantId, tenantId)))
    .limit(1);
  if (!existingOwner || !existingOwner.userId) return null;

  await db.transaction(async (tx) => {
    await syncUserOwnerProfile(tx, existingOwner.userId, input);

    if (input.roles !== undefined) {
      await tx.delete(userRoles).where(eq(userRoles.userId, existingOwner.userId));
      if (input.roles.length > 0) {
        await tx.insert(userRoles).values(
          input.roles.map((role) => ({ userId: existingOwner.userId!, role, scopeTenantId: tenantId })),
        );
      }
    }
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "owner",
    entityId: id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return { success: true };
}

export async function deleteOwner(tenantId: string, id: string, userId: string) {
  const [owner] = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, id), eq(owners.tenantId, tenantId)))
    .limit(1);
  if (!owner) return;

  await db.transaction(async (tx) => {
    await tx.update(owners).set({ status: "deleted", updatedAt: new Date() }).where(eq(owners.id, owner.id));
    if (owner.userId) {
      await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, owner.userId));
    }
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "owner",
    entityId: id,
    oldValues: { fullName: owner.fullName } as Record<string, unknown>,
  });
}

export async function assignUnitToOwner(
  tenantId: string,
  ownerId: string,
  unitId: string,
  userId: string,
) {
  const [owner] = await db
    .select({ id: owners.id })
    .from(owners)
    .where(and(eq(owners.id, ownerId), eq(owners.tenantId, tenantId)))
    .limit(1);
  if (!owner) throw new DomainError("owner_not_found", "Owner not found");

  await db.transaction(async (tx) => {
    const [unit] = await tx
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId), eq(units.status, "active")))
      .limit(1);
    if (!unit) throw new DomainError("unit_not_found", "Unit not found");

    const [existing] = await tx
      .select({ id: ownerships.id })
      .from(ownerships)
      .where(and(
        eq(ownerships.ownerId, ownerId),
        eq(ownerships.unitId, unitId),
        eq(ownerships.tenantId, tenantId),
      ))
      .limit(1);
    if (existing) throw new DomainError("unit_already_assigned", "Квартира уже привязана к этому собственнику");

    const [unitAssigned] = await tx
      .select({ id: ownerships.id })
      .from(ownerships)
      .where(and(eq(ownerships.unitId, unitId), eq(ownerships.tenantId, tenantId)))
      .limit(1);
    if (unitAssigned) throw new DomainError("unit_assigned_elsewhere", "Квартира уже привязана к другому собственнику");

    const [created] = await tx.insert(ownerships).values({
      tenantId,
      ownerId,
      unitId,
      registeredDate: new Date().toISOString().slice(0, 10),
      isPrimary: false,
    }).returning();
    if (!created) throw new Error("Failed to assign unit");

    await writeAuditLog({
      tenantId,
      userId,
      action: "create",
      entityType: "ownership",
      entityId: created.id,
      newValues: { ownerId, unitId },
    }, tx as unknown as typeof db);

    return created;
  });

  return { success: true };
}

export async function createAndAssignUnitToOwner(
  tenantId: string,
  ownerId: string,
  input: {
    unitNumber: string;
    floor: number;
    entrance: number;
    type: "residential" | "commercial" | "parking" | "storage" | "other";
    area: string;
  },
  userId: string,
) {
  const [owner] = await db
    .select({ id: owners.id })
    .from(owners)
    .where(and(eq(owners.id, ownerId), eq(owners.tenantId, tenantId)))
    .limit(1);
  if (!owner) throw new DomainError("owner_not_found", "Owner not found");

  const [building] = await db
    .select()
    .from(buildings)
    .where(eq(buildings.tenantId, tenantId))
    .limit(1);
  if (!building) throw new DomainError("building_not_found", "No building found");

  const result = await db.transaction(async (tx) => {
    const [unit] = await tx.insert(units).values({
      tenantId,
      buildingId: building.id,
      unitNumber: input.unitNumber,
      entrance: input.entrance,
      floor: input.floor,
      type: input.type,
      area: input.area,
    }).returning();
    if (!unit) throw new Error("Failed to create unit");

    await tx.insert(ownerships).values({
      tenantId,
      ownerId,
      unitId: unit.id,
      registeredDate: new Date().toISOString().slice(0, 10),
      isPrimary: false,
    });

    return unit;
  });
  if (!result) throw new Error("Failed to create unit");

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "unit",
    entityId: result.id,
    newValues: { ownerId, ...input },
  });

  return result;
}

export async function getUnassignedUnits(tenantId: string, ownerId: string) {
  const ownerUnitIds = await db
    .select({ unitId: ownerships.unitId })
    .from(ownerships)
    .where(and(
      eq(ownerships.ownerId, ownerId),
      eq(ownerships.tenantId, tenantId),
    ));

  const excludeIds = ownerUnitIds.map((o) => o.unitId);

  const baseConditions = and(
    eq(units.tenantId, tenantId),
    eq(units.status, "active"),
  );

  const conditions = excludeIds.length > 0
    ? and(baseConditions, notInArray(units.id, excludeIds))
    : baseConditions;

  return await db
    .select()
    .from(units)
    .where(conditions)
    .orderBy(units.unitNumber);
}

export async function removeUnitFromOwner(
  tenantId: string,
  ownerId: string,
  unitId: string,
  userId: string,
) {
  const [link] = await db
    .select({ id: ownerships.id })
    .from(ownerships)
    .where(and(
      eq(ownerships.ownerId, ownerId),
      eq(ownerships.unitId, unitId),
      eq(ownerships.tenantId, tenantId),
    ))
    .limit(1);
  if (!link) throw new DomainError("ownership_not_found", "Связь не найдена");

  await db
    .delete(ownerships)
    .where(and(
      eq(ownerships.ownerId, ownerId),
      eq(ownerships.unitId, unitId),
      eq(ownerships.tenantId, tenantId),
    ));

  await writeAuditLog({
    tenantId,
    userId,
    action: "delete",
    entityType: "ownership",
    entityId: link.id,
    oldValues: { ownerId, unitId },
  });

  return { success: true };
}

export async function updateOwnerPassword(tenantId: string, id: string, newPassword: string, userId: string) {
  const [owner] = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, id), eq(owners.tenantId, tenantId)))
    .limit(1);
  if (!owner || !owner.userId) throw new DomainError("owner_not_found", "Owner not found");

  if (newPassword.length < 12) throw new DomainError("weak_password", "Password must be at least 12 characters");

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, owner.userId));

  await db.delete(sessions).where(eq(sessions.userId, owner.userId));

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "user",
    entityId: owner.userId,
    newValues: { passwordChanged: true },
  });

  return { success: true };
}
