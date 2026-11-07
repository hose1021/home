"use server";

import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {VOTING_TYPES} from "@/core/db/schema/enums";
import {dateSchema, moneySchema} from "@/core/validation/action-schemas";
import {createVoting} from "./voting.service";

const votingSchema = z.object({
  title: z.string().trim().min(1).max(500),
  votingType: z.enum(VOTING_TYPES),
  startDate: dateSchema,
  endDate: dateSchema,
  quorumRequired: moneySchema.default("50.00"),
  options: z.array(z.string().trim().min(1).max(255)).min(2).max(50),
});

export async function createVotingAction(input: z.input<typeof votingSchema>) {
  return runAction({
    permission: "voting:write",
    schema: votingSchema,
    errors: "errors",
    revalidate: ["/voting"],
    handler: async ({session, tenantId}, data) => {
      await createVoting(tenantId, session.user.id, {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });
      return {success: true};
    },
  }, input);
}
