import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";
import {eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {invalidateTenantCache} from "@/core/multi-tenant";

type CreateTenantInput = {
  slug: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
};

type UpdateTenantInput = Partial<CreateTenantInput> & {
  status?: "active" | "suspended" | "archived";
};

export async function createTenant(input: CreateTenantInput, userId: string) {
  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: input.slug,
      name: input.name,
      taxId: input.taxId ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
    })
    .returning();

  await writeAuditLog({
    tenantId: tenant.id,
    userId,
    action: "create",
    entityType: "tenant",
    entityId: tenant.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return tenant;
}

export async function getTenantById(id: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return tenant ?? null;
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function updateTenant(id: string, input: UpdateTenantInput, userId: string) {
  const old = await getTenantById(id);
  if (!old) throw new Error("Tenant not found");

  const [updated] = await db
    .update(tenants)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();

  invalidateTenantCache(old.slug);
  if (input.slug && input.slug !== old.slug) invalidateTenantCache(input.slug);

  await writeAuditLog({
    tenantId: id,
    userId,
    action: "update",
    entityType: "tenant",
    entityId: id,
    oldValues: old as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function listTenants() {
  return await db.select().from(tenants).orderBy(tenants.createdAt);
}

export async function deactivateTenant(id: string, userId: string) {
  return updateTenant(id, { status: "suspended" }, userId);
}
