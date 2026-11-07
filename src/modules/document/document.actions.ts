"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {DOCUMENT_CATEGORIES, type DocumentCategory} from "./document.constants";
import {uploadDocument} from "./document.service";

const documentInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  category: z.enum(DOCUMENT_CATEGORIES),
  description: z.string().trim().max(2000).optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  bytes: z.custom<Uint8Array>((value) => value instanceof Uint8Array),
});

export async function uploadDocumentAction(input: {
  title: string;
  category: DocumentCategory;
  description?: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  return runAction({
    permission: "document:write",
    schema: documentInputSchema,
    errors: "documents.errors",
    revalidate: ["/documents"],
    handler: async ({session, tenantId}, data) => {
      await uploadDocument(tenantId, session.user.id, data);
      return {success: true};
    },
  }, input);
}
