import {eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";
import {DomainError} from "@/core/errors/app-error";
import {invalidateTenantCache} from "@/core/multi-tenant";

export type UpdateTenantInput = {
  slug?: string;
  name?: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
};

export async function getTenantById(id: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return tenant ?? null;
}

export async function updateTenant(id: string, input: UpdateTenantInput, userId: string) {
  const old = await getTenantById(id);
  if (!old) throw new DomainError("tenantNotFound");

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
