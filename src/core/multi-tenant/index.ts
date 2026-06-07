import { db } from "@/core/db";
import { tenants } from "@/core/db/schema/tenants";
import { eq } from "drizzle-orm";

export async function resolveTenantFromSlug(slug: string) {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  return tenant?.id ?? null;
}

export async function ensureTenantExists(slug: string): Promise<string> {
  const id = await resolveTenantFromSlug(slug);
  if (!id) throw new Error(`Tenant not found: ${slug}`);
  return id;
}
