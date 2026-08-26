import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {meetings} from "@/core/db/schema/meetings";
import {protocols, protocolSignatures} from "@/core/db/schema/protocols";

export type ProtocolStatus = "draft" | "pending_signature" | "signed" | "archived";

export async function listProtocols(tenantId: string) {
  return await db
    .select({
      id: protocols.id,
      protocolNumber: protocols.protocolNumber,
      status: protocols.status,
      content: protocols.content,
      signedAt: protocols.signedAt,
      createdAt: protocols.createdAt,
      meetingId: protocols.meetingId,
      meetingTitle: meetings.title,
      signatureCount: db.$count(protocolSignatures, eq(protocolSignatures.protocolId, protocols.id)).as("signatureCount"),
    })
    .from(protocols)
    .leftJoin(meetings, and(eq(meetings.id, protocols.meetingId), eq(meetings.tenantId, tenantId)))
    .where(eq(protocols.tenantId, tenantId))
    .orderBy(desc(protocols.createdAt));
}

export async function createProtocol(
  tenantId: string,
  input: { meetingId: string; protocolNumber: string; content: string },
  userId: string,
) {
  const [created] = await db.insert(protocols).values({
    tenantId,
    meetingId: input.meetingId,
    protocolNumber: input.protocolNumber.trim(),
    content: input.content.trim(),
    status: "draft",
    createdBy: userId,
  }).returning();
  if (!created) throw new Error("Failed to create protocol");

  await writeAuditLog({
    tenantId, userId,
    action: "create",
    entityType: "protocol",
    entityId: created.id,
    newValues: { protocolNumber: created.protocolNumber, status: created.status } as Record<string, unknown>,
  });
  return created;
}

export async function signProtocol(tenantId: string, id: string, userId: string) {
  const protocol = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new Error("Протокол не найден");
    if (existing.status === "archived") throw new Error("Архивный протокол нельзя подписать");

    const [signature] = await tx.insert(protocolSignatures).values({
      protocolId: id,
      userId,
      signature: `signed-${Date.now()}`,
    }).returning();
    if (!signature) throw new Error("Failed to sign protocol");

    const [updated] = await tx.update(protocols).set({
      status: "signed",
      signedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(protocols.id, id), eq(protocols.tenantId, tenantId))).returning();
    if (!updated) throw new Error("Протокол не найден");

    await writeAuditLog({
      tenantId, userId,
      action: "update",
      entityType: "protocol",
      entityId: id,
      oldValues: { status: existing.status } as Record<string, unknown>,
      newValues: { status: "signed" } as Record<string, unknown>,
    }, tx as unknown as typeof db);
    return updated;
  });
  return protocol;
}
