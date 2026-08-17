import {and, desc, eq, ne} from "drizzle-orm";
import {db} from "@/core/db";
import {commandants} from "@/core/db/schema/commandants";
import {writeAuditLog} from "@/core/audit/audit.service";

export type CommandantInput = {
  ownerId?: string | null;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listCommandants(tenantId: string) {
  return await db
    .select()
    .from(commandants)
    .where(eq(commandants.tenantId, tenantId))
    .orderBy(desc(commandants.isActive), desc(commandants.startDate));
}

export async function getActiveCommandant(tenantId: string) {
  const [row] = await db
    .select()
    .from(commandants)
    .where(and(eq(commandants.tenantId, tenantId), eq(commandants.isActive, true)))
    .orderBy(desc(commandants.startDate))
    .limit(1);
  return row ?? null;
}

async function deactivateOthers(tx: typeof db, tenantId: string, endDate: string, excludeId?: string) {
  await tx
    .update(commandants)
    .set({ isActive: false, endDate, updatedAt: new Date() })
    .where(and(
      eq(commandants.tenantId, tenantId),
      eq(commandants.isActive, true),
      excludeId ? ne(commandants.id, excludeId) : undefined,
    ));
}



export async function createCommandant(tenantId: string, input: CommandantInput, userId: string) {
  const created = await db.transaction(async (tx) => {
    if (input.isActive) {
      await deactivateOthers(tx as unknown as typeof db, tenantId, input.startDate);
    }
    const [row] = await tx
      .insert(commandants)
      .values({
        tenantId,
        ownerId: input.ownerId ?? null,
        fullName: input.fullName,
        phone: input.phone ?? null,
        isActive: input.isActive,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
      })
      .returning();
    return row;
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "commandant",
    entityId: created.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return created;
}

export async function updateCommandant(
  tenantId: string,
  id: string,
  input: Partial<CommandantInput>,
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(commandants)
    .where(and(eq(commandants.id, id), eq(commandants.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new Error("Комендант не найден");

  const updated = await db.transaction(async (tx) => {
    if (input.isActive) {
      await deactivateOthers(tx as unknown as typeof db, tenantId, input.startDate ?? today(), id);
    }
    const [row] = await tx
      .update(commandants)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(commandants.id, id), eq(commandants.tenantId, tenantId)))
      .returning();
    return row;
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "update",
    entityType: "commandant",
    entityId: id,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: input as unknown as Record<string, unknown>,
  });

  return updated;
}
