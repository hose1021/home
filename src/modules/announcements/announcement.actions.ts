"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES} from "@/core/db/schema/enums";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createAnnouncement, deleteAnnouncement, updateAnnouncement} from "./announcement.service";

const announcementInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(20000),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  isPinned: z.boolean().optional(),
  isDashboard: z.boolean().optional(),
});

const announcementUpdateSchema = announcementInputSchema.partial().extend({
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),
});

const announcementIdSchema = z.object({id: uuidSchema});

export async function createAnnouncementAction(input: z.input<typeof announcementInputSchema>) {
  return runAction({
    permission: "announcement:write",
    schema: announcementInputSchema,
    errors: "announcements.errors",
    revalidate: ["/announcements", "/"],
    handler: async ({session, tenantId}, data) => {
      await createAnnouncement(tenantId, session.user.id, data);
      return {success: true};
    },
  }, input);
}

export async function updateAnnouncementAction(id: string, input: z.input<typeof announcementUpdateSchema>) {
  return runAction({
    permission: "announcement:write",
    schema: announcementUpdateSchema.extend({id: uuidSchema}),
    errors: "announcements.errors",
    revalidate: ["/announcements", "/"],
    handler: async ({session, tenantId}, data) => {
      const {id: announcementId, ...fields} = data;
      await updateAnnouncement(tenantId, announcementId, session.user.id, fields);
      return {success: true};
    },
  }, {...input, id});
}

export async function deleteAnnouncementAction(id: string) {
  return runAction({
    permission: "announcement:write",
    schema: announcementIdSchema,
    errors: "announcements.errors",
    revalidate: ["/announcements"],
    handler: async ({session, tenantId}, data) => {
      await deleteAnnouncement(tenantId, data.id, session.user.id);
      return {success: true};
    },
  }, {id});
}
