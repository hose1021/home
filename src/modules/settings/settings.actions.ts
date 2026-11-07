"use server";

import {cookies} from "next/headers";
import {z} from "zod";
import {runAction} from "@/core/actions/action";
import {getSessionCookieName} from "@/core/auth/session";
import {passwordSchema} from "@/core/validation/action-schemas";
import {updateTenant} from "@/modules/tenant/tenant.service";
import {changeOwnPassword, updateProfile} from "./settings.service";

const tenantSettingsSchema = z.object({
  name: z.string().trim().min(2).max(255),
  address: z.string().trim().max(1000).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  taxId: z.string().trim().max(20).nullable().optional(),
});

export async function updateSettingsAction(input: z.input<typeof tenantSettingsSchema>) {
  return runAction({
    permission: "settings:write",
    schema: tenantSettingsSchema,
    errors: "errors",
    revalidate: ["/"],
    handler: ({tenantId, session}, data) => updateTenant(tenantId, data, session.user.id),
  }, input);
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(50).nullable().optional(),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>) {
  return runAction({
    schema: profileSchema,
    errors: "settings.errors",
    revalidate: ["/"],
    handler: ({session}, data) => updateProfile(session.user.id, data),
  }, input);
}

export async function changeOwnPasswordAction(currentPassword: string, newPassword: string) {
  return runAction({
    schema: z.object({currentPassword: z.string().min(1), newPassword: passwordSchema}),
    errors: "settings.errors",
    handler: async ({session}, data) => {
      const cookieStore = await cookies();
      const currentToken = cookieStore.get(getSessionCookieName())?.value;
      await changeOwnPassword(session.user.id, data.currentPassword, data.newPassword, currentToken);
      return {success: true};
    },
  }, {currentPassword, newPassword});
}
