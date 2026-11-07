"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {NOTIFICATION_CHANNELS, NOTIFICATION_TYPES} from "@/core/db/schema/enums";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createNotification, markNotificationRead} from "./notification.service";

const notificationSchema = z.object({
  userId: uuidSchema,
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().max(4000).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).default("in_app"),
});

const notificationIdSchema = z.object({id: uuidSchema});

export async function createNotificationAction(input: z.input<typeof notificationSchema>) {
  return runAction({
    permission: "notification:send",
    schema: notificationSchema,
    errors: "errors",
    revalidate: ["/notifications"],
    handler: async ({session, tenantId}, data) => {
      await createNotification(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function markNotificationReadAction(id: string) {
  return runAction({
    schema: notificationIdSchema,
    errors: "errors",
    revalidate: ["/notifications"],
    handler: async ({session, tenantId}, data) => {
      await markNotificationRead(tenantId, session.user.id, data.id);
      return {success: true};
    },
  }, {id});
}
