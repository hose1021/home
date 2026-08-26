"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireTenantPermission} from "@/core/auth/session";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createNotification, markNotificationRead} from "./notification.service";

const notificationSchema = z.object({
  userId: uuidSchema,
  type: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().max(4000).optional(),
  channel: z.enum(["push", "sms", "in_app"]).default("in_app"),
});

export async function createNotificationAction(input: z.infer<typeof notificationSchema>) {
  input = notificationSchema.parse(input);
  const { session, tenantId } = await requireTenantPermission("notification:send");
  await createNotification(tenantId, input, session.user.id);
  revalidatePath("/notifications");
  return { success: true };
}

export async function markNotificationReadAction(id: string) {
  id = uuidSchema.parse(id);
  const { session, tenantId } = await requireTenantPermission("notification:send");
  await markNotificationRead(tenantId, session.user.id, id);
  revalidatePath("/notifications");
  return { success: true };
}
