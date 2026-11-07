import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {documents} from "@/core/db/schema/documents";
import {users} from "@/core/db/schema/users";
import {DomainError} from "@/core/errors/app-error";
import {ALLOWED_MIME_SET, MAX_DOCUMENT_BYTES, type DocumentCategory} from "./document.constants";
import {createDefaultStorage, newObjectKey, type Storage} from "./storage";

export function validateUpload(input: {mimeType: string; sizeBytes: number}) {
  if (input.sizeBytes === 0) throw new DomainError("empty_file");
  if (input.sizeBytes > MAX_DOCUMENT_BYTES) throw new DomainError("too_large", "too_large", 413);
  if (!ALLOWED_MIME_SET.has(input.mimeType)) throw new DomainError("forbidden_mime");
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
    if (!created) throw new DomainError("not_found");

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
      createdAt: documents.createdAt,
      uploadedByName: users.fullName,
    })
    .from(documents)
    .leftJoin(users, and(eq(users.id, documents.createdBy), eq(users.tenantId, documents.tenantId)))
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt));
}
