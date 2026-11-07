"use server";

import {revalidatePath} from "next/cache";
import {cookies} from "next/headers";
import {z} from "zod";
import {requireAuth} from "@/core/auth/session";
import {canActAs, serializeViewAs, VIEW_AS_COOKIE, type ViewAsInput} from "@/core/auth/view-as";
import {ROLES} from "@/core/db/schema/enums";
import {ForbiddenError} from "@/core/errors/app-error";
import {uuidSchema} from "@/core/validation/action-schemas";
import {isActiveTenantUser} from "./impersonation.service";

const viewAsSchema = z.union([
  z.object({kind: z.literal("off")}),
  z.object({kind: z.literal("role"), role: z.enum(ROLES)}),
  z.object({kind: z.literal("user"), userId: uuidSchema}),
]);

/**
 * Switches the admin's view without touching the session token. The cookie names an identity;
 * every request re-checks that the real actor may impersonate, so a forged cookie is inert.
 */
export async function setViewAsAction(input: ViewAsInput) {
  const session = await requireAuth();
  if (!canActAs(session.actor)) throw new ForbiddenError("Cannot view as another identity");

  const mode = viewAsSchema.parse(input);
  const store = await cookies();

  if (mode.kind === "off") {
    store.delete(VIEW_AS_COOKIE);
  } else {
    if (mode.kind === "user" && !(await isActiveTenantUser(session.actor.tenantId, mode.userId))) {
      throw new ForbiddenError("Unknown viewer target");
    }
    const value = serializeViewAs(mode);
    if (!value) throw new ForbiddenError("Unknown viewer target");
    store.set(VIEW_AS_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  revalidatePath("/", "layout");
  return {success: true};
}
