import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {documents} from "@/core/db/schema/documents";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";
import {MAX_DOCUMENT_BYTES, type DocumentCategory} from "./document.constants";
import {ALLOWED_MIME_TYPES} from "./mime";
import {createDefaultStorage, newObjectKey, type Storage} from "./storage";

type DocumentErrorCode = "not_found" | "empty_file" | "too_large" | "forbidden_mime";

const ERROR_STATUS: Record<DocumentErrorCode, number> = {
  not_found: 404,
  empty_file: 400,
  too_large: 413,
  forbidden_mime: 400,
};

export class DocumentError extends DomainError {
  constructor(code: DocumentErrorCode) {
    super(code, `Document error: ${code}`, ERROR_STATUS[code]);
  }
}

export function validateUpload(input: {mimeType: string; sizeBytes: number}) {
  if (input.sizeBytes === 0) throw new DocumentError("empty_file");
  if (input.sizeBytes > MAX_DOCUMENT_BYTES) throw new DocumentError("too_large");
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) throw new DocumentError("forbidden_mime");
}

export async function uploadDocument(
  tenantId: string,
  userId: string,
  input: {
    title: string;
    category: DocumentCategory;
    description?: string | null;
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  },
  storage?: Storage,
) {
  const store = storage ?? await createDefaultStorage();
  validateUpload({mimeType: input.mimeType, sizeBytes: input.bytes.byteLength});

  const key = newObjectKey();
  await store.put(key, input.bytes);
  try {
    const [created] = await db.insert(documents).values({
      tenantId,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      originalFileName: input.fileName.trim(),
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      objectKey: key,
      createdBy: userId,
    }).returning();
    if (!created) throw new Error("Failed to create document");

    await writeAuditLog({
      tenantId,
      userId,
      action: "create",
      entityType: "document",
      entityId: created.id,
      newValues: {title: created.title, category: created.category, sizeBytes: created.sizeBytes} as Record<string, unknown>,
    });
    return created;
  } catch (err) {
    await store.delete(key).catch(() => {});
    throw err;
  }
}

export async function listDocuments(tenantId: string) {
  return await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      description: documents.description,
      originalFileName: documents.originalFileName,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      status: documents.status,
      createdAt: documents.createdAt,
      uploadedByName: users.fullName,
    })
    .from(documents)
    .leftJoin(users, and(eq(users.id, documents.createdBy), eq(users.tenantId, documents.tenantId)))
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentObject(tenantId: string, id: string, storage?: Storage) {
  const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!existing || existing.tenantId !== tenantId) throw new DocumentError("not_found");
  const store = storage ?? await createDefaultStorage();
  return {document: existing, bytes: await store.get(existing.objectKey)};
}

export async function archiveDocument(tenantId: string, id: string, userId: string) {
  const [existing] = await db
    .select({id: documents.id, tenantId: documents.tenantId, status: documents.status})
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!existing || existing.tenantId !== tenantId) throw new DocumentError("not_found");
  if (existing.status === "archived") return {id: existing.id, status: "archived" as const};

  const [updated] = await db.update(documents)
    .set({status: "archived", updatedAt: new Date()})
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .returning();
  if (!updated) throw new DocumentError("not_found");

  await writeAuditLog({
    tenantId, userId,
    action: "update",
    entityType: "document",
    entityId: id,
    oldValues: {status: existing.status} as Record<string, unknown>,
    newValues: {status: "archived"} as Record<string, unknown>,
  });
  return updated;
}

export async function deleteDocument(tenantId: string, id: string, userId: string, storage?: Storage) {
  const [existing] = await db
    .select({id: documents.id, tenantId: documents.tenantId, title: documents.title, status: documents.status, objectKey: documents.objectKey})
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!existing || existing.tenantId !== tenantId) throw new DocumentError("not_found");

  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)));

  const store = storage ?? await createDefaultStorage();
  await store.delete(existing.objectKey).catch((err: unknown) => {
    // ponytail: orphaned bytes possible on storage failure; a cleanup sweep can come with the backup ticket
    console.error(`[documents] failed to delete stored object ${existing.objectKey}:`, err);
  });

  await writeAuditLog({
    tenantId, userId,
    action: "delete",
    entityType: "document",
    entityId: id,
    oldValues: {title: existing.title, status: existing.status, objectKey: existing.objectKey} as Record<string, unknown>,
  });
}
