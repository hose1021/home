"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {translateDomainError} from "@/core/errors/app-error";
import {DOCUMENT_CATEGORIES, type DocumentCategory} from "./document.constants";
import {uploadDocument} from "./document.service";

const documentInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  category: z.enum(DOCUMENT_CATEGORIES),
  description: z.string().trim().max(2000).optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  bytes: z.instanceof(Uint8Array),
});

export async function uploadDocumentAction(input: {
  title: string;
  category: DocumentCategory;
  description?: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  const t = await getTranslations("documents.errors");
  input = documentInputSchema.parse(input);
  const {session, tenantId} = await requireTenantPermission("document:write");
  try {
    await uploadDocument(tenantId, session.user.id, input);
  } catch (err) {
    translateDomainError(err, t);
  }
  revalidatePath("/documents");
  return {success: true};
}
