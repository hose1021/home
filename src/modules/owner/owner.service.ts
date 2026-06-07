import { db } from "@/core/db";
import { owners, ownerships } from "@/core/db/schema/owners";
import { units } from "@/core/db/schema/units";
import { buildings } from "@/core/db/schema/buildings";
import { users, userRoles } from "@/core/db/schema/users";
import { eq, and } from "drizzle-orm";
import { assertValidUsername, hashPassword, normalizeUsername } from "@/core/auth/auth";
import type { Role } from "@/core/auth/permissions";

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
}) {
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

    return createdOwner;
  });

  return owner;
}

export async function updateOwnerWithRoles(tenantId: string, id: string, input: {
  fullName?: string;
  phone?: string | null;
  username?: string;
  roles?: Role[];
}) {
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

  return { success: true };
}

export async function deleteOwner(tenantId: string, id: string) {
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
}
