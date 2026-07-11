"use server";

import {revalidatePath} from "next/cache";
import {requirePermission} from "@/core/auth/session";
import {createTenant, deactivateTenant, updateTenant} from "./tenant.service";
import {createTenantSchema, updateTenantSchema} from "./tenant.validators";

export async function createTenantAction(input: {
  slug: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
}) {
  const session = await requirePermission("tenant:write");
  const tenant = await createTenant(createTenantSchema.parse(input), session.user.id);
  revalidatePath("/admin/tenants");
  return { success: true, tenant };
}

export async function updateTenantAction(
  id: string,
  input: {
    name?: string;
    slug?: string;
    address?: string;
    status?: "active" | "suspended" | "archived";
  },
) {
  const session = await requirePermission("tenant:write");
  const updated = await updateTenant(id, updateTenantSchema.parse(input), session.user.id);
  revalidatePath("/admin/tenants", "layout");
  return { success: true, tenant: updated };
}

export async function deactivateTenantAction(id: string) {
  const session = await requirePermission("tenant:write");
  const updated = await deactivateTenant(id, session.user.id);
  revalidatePath("/admin/tenants");
  return { success: true, tenant: updated };
}
