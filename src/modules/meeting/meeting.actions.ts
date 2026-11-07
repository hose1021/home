"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {MEETING_FORMATS, MEETING_STATUSES, MEETING_TYPES} from "@/core/db/schema/enums";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createMeeting, deleteMeeting, updateMeeting} from "./meeting.service";

const agendaSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(1000),
});

const meetingInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  meetingType: z.enum(MEETING_TYPES),
  meetingFormat: z.enum(MEETING_FORMATS),
  status: z.enum(MEETING_STATUSES).optional(),
  proposedDate: z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "Invalid meeting date"),
  location: z.string().trim().max(255).optional(),
  onlineLink: z.string().url().max(2000).optional(),
  agendas: z.array(agendaSchema).max(100),
});

const meetingIdSchema = z.object({id: uuidSchema});

export async function createMeetingAction(input: z.input<typeof meetingInputSchema>) {
  return runAction({
    permission: "meeting:write",
    schema: meetingInputSchema,
    errors: "errors",
    revalidate: ["/meetings"],
    handler: async ({session, tenantId}, data) => {
      await createMeeting(tenantId, session.user.id, {
        ...data,
        proposedDate: new Date(data.proposedDate),
      });
      return {success: true};
    },
  }, input);
}

export async function updateMeetingAction(id: string, input: Partial<z.input<typeof meetingInputSchema>>) {
  return runAction({
    permission: "meeting:write",
    schema: meetingInputSchema.partial().extend({id: uuidSchema}),
    errors: "errors",
    revalidate: ["/meetings"],
    handler: async ({session, tenantId}, data) => {
      const {id: meetingId, proposedDate, ...fields} = data;
      await updateMeeting(tenantId, meetingId, {
        ...fields,
        proposedDate: proposedDate ? new Date(proposedDate) : undefined,
      }, session.user.id);
      return {success: true};
    },
  }, {...input, id});
}

export async function deleteMeetingAction(id: string) {
  return runAction({
    permission: "meeting:write",
    schema: meetingIdSchema,
    errors: "errors",
    revalidate: ["/meetings"],
    handler: async ({session, tenantId}, data) => {
      await deleteMeeting(tenantId, data.id, session.user.id);
      return {success: true};
    },
  }, {id});
}
