import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";
import {buildings} from "@/core/db/schema/buildings";
import {userRoles, users, sessions} from "@/core/db/schema/users";
import {and, eq, notInArray} from "drizzle-orm";
import {assertValidUsername, hashPassword, normalizeUsername} from "@/core/auth/auth";
import type {Role} from "@/core/auth/permissions";
import {writeAuditLog} from "@/core/audit/audit.service";

export async function getOwnerById(tenantId: string, id: string) {
  const [o] = await db
    .select()
    .from(owners)
    .where(and(eq(owners.id, id), eq(owners.tenantId, tenantId)))
    .limit(1);
  return o ?? null;
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
  if (!building) throw new Error("No building found");

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

    const [unit] = await tx.insert(units).values({
      tenantId,
      buildingId: building.id,
      unitNumber: input.unitNumber,
      entrance: input.entrance,
      floor: input.floor,
      type: input.type,
      area: input.area,
    }).returning();

    const [createdOwner] = await tx.insert(owners).values({
      tenantId,
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
    }).returning();

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
    const userUpdate: Record<string, unknown> = {};
    if (input.fullName !== undefined) userUpdate.fullName = input.fullName;
    if (input.phone !== undefined) userUpdate.phone = input.phone;
    if (input.username !== undefined) {
      const u = normalizeUsername(input.username);
      assertValidUsername(u);
      userUpdate.username = u;
    }
    if (Object.keys(userUpdate).length > 0) {
      await tx.update(users).set(userUpdate).where(eq(users.id, existingOwner.userId));
    }

    const ownerUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (input.fullName !== undefined) ownerUpdate.fullName = input.fullName;
    if (input.phone !== undefined) ownerUpdate.phone = input.phone;
    await tx.update(owners).set(ownerUpdate).where(eq(owners.id, existingOwner.id));

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
  if (!owner) throw new Error("Owner not found");

  await db.transaction(async (tx) => {
    const [unit] = await tx
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, unitId), eq(units.tenantId, tenantId), eq(units.status, "active")))
      .limit(1);
    if (!unit) throw new Error("Unit not found");

    const [existing] = await tx
      .select({ id: ownerships.id })
      .from(ownerships)
      .where(and(
        eq(ownerships.ownerId, ownerId),
        eq(ownerships.unitId, unitId),
        eq(ownerships.tenantId, tenantId),
      ))
      .limit(1);
    if (existing) throw new Error("Квартира уже привязана к этому собственнику");

    const [unitAssigned] = await tx
      .select({ id: ownerships.id })
      .from(ownerships)
      .where(and(eq(ownerships.unitId, unitId), eq(ownerships.tenantId, tenantId)))
      .limit(1);
    if (unitAssigned) throw new Error("Квартира уже привязана к другому собственнику");

    const [created] = await tx.insert(ownerships).values({
      tenantId,
      ownerId,
      unitId,
      registeredDate: new Date().toISOString().slice(0, 10),
      isPrimary: false,
    }).returning();

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
  if (!owner) throw new Error("Owner not found");

  const [building] = await db
    .select()
    .from(buildings)
    .where(eq(buildings.tenantId, tenantId))
    .limit(1);
  if (!building) throw new Error("No building found");

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

    await tx.insert(ownerships).values({
      tenantId,
      ownerId,
      unitId: unit.id,
      registeredDate: new Date().toISOString().slice(0, 10),
      isPrimary: false,
    });

    return unit;
  });

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
  if (!link) throw new Error("Связь не найдена");

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
  if (!owner || !owner.userId) throw new Error("Owner not found");

  if (newPassword.length < 12) throw new Error("Password must be at least 12 characters");

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
