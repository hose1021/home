"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createProtocol, signProtocol} from "./protocol.service";

const protocolSchema = z.object({
  meetingId: uuidSchema,
  protocolNumber: z.string().trim().min(1).max(50),
  content: z.string().trim().min(1).max(20000),
});

export async function createProtocolAction(input: z.infer<typeof protocolSchema>) {
  input = protocolSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("protocol:write");
  await createProtocol(tenantId, input, session.user.id);
  revalidatePath("/protocols");
  return { success: true };
}

export async function signProtocolAction(id: string) {
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("protocol:sign");
  await signProtocol(tenantId, id, session.user.id);
  revalidatePath("/protocols");
  return { success: true };
}
