"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {uuidSchema} from "@/core/validation/action-schemas";
import {createProtocol, signProtocol} from "./protocol.service";

const protocolSchema = z.object({
  meetingId: uuidSchema,
  protocolNumber: z.string().trim().min(1).max(50),
  content: z.string().trim().min(1).max(20000),
});

const protocolIdSchema = z.object({id: uuidSchema});

export async function createProtocolAction(input: z.input<typeof protocolSchema>) {
  return runAction({
    permission: "protocol:write",
    schema: protocolSchema,
    errors: "errors",
    revalidate: ["/protocols"],
    handler: async ({session, tenantId}, data) => {
      await createProtocol(tenantId, data, session.user.id);
      return {success: true};
    },
  }, input);
}

export async function signProtocolAction(id: string) {
  return runAction({
    permission: "protocol:sign",
    schema: protocolIdSchema,
    errors: "errors",
    revalidate: ["/protocols"],
    handler: async ({session, tenantId}, data) => {
      await signProtocol(tenantId, data.id, session.user.id);
      return {success: true};
    },
  }, {id});
}
