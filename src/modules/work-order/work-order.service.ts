import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {contractors} from "@/core/db/schema/contractors";
import {tickets} from "@/core/db/schema/tickets";
import {workOrders} from "@/core/db/schema/work-orders";

export type WorkOrderStatus = "pending" | "approved" | "in_progress" | "completed" | "cancelled";

export async function listWorkOrders(tenantId: string) {
  return await db
    .select({
      id: workOrders.id,
      title: workOrders.title,
      description: workOrders.description,
      status: workOrders.status,
      estimatedCost: workOrders.estimatedCost,
      actualCost: workOrders.actualCost,
      scheduledDate: workOrders.scheduledDate,
      completedDate: workOrders.completedDate,
      createdAt: workOrders.createdAt,
      contractorId: workOrders.contractorId,
      contractorName: contractors.name,
      ticketId: workOrders.ticketId,
    })
    .from(workOrders)
    .leftJoin(contractors, and(eq(contractors.id, workOrders.contractorId), eq(contractors.tenantId, tenantId)))
    .leftJoin(tickets, and(eq(tickets.id, workOrders.ticketId), eq(tickets.tenantId, tenantId)))
    .where(eq(workOrders.tenantId, tenantId))
    .orderBy(desc(workOrders.createdAt));
}

export async function createWorkOrder(
  tenantId: string,
  input: {
    title: string;
    description?: string;
    contractorId?: string;
    ticketId?: string;
    estimatedCost?: string;
    scheduledDate?: Date;
  },
  userId: string,
) {
  const [created] = await db.insert(workOrders).values({
    tenantId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    contractorId: input.contractorId ?? null,
    ticketId: input.ticketId ?? null,
    estimatedCost: input.estimatedCost ?? null,
    scheduledDate: input.scheduledDate ?? null,
    status: "pending",
    createdBy: userId,
  }).returning();
  if (!created) throw new Error("Failed to create work order");

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "work_order",
    entityId: created.id,
    newValues: { title: created.title, status: created.status } as Record<string, unknown>,
  });
  return created;
}

export async function updateWorkOrderStatus(
  tenantId: string,
  id: string,
  status: WorkOrderStatus,
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
    .limit(1);
  if (!existing) throw new Error("Наряд не найден");

  const [updated] = await db.update(workOrders).set({
    status,
    completedDate: status === "completed" ? new Date() : existing.completedDate,
    updatedAt: new Date(),
  }).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId))).returning();
  if (!updated) throw new Error("Наряд не найден");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "work_order",
    entityId: id,
    oldValues: { status: existing.status } as Record<string, unknown>,
    newValues: { status } as Record<string, unknown>,
  });
  return updated;
}
