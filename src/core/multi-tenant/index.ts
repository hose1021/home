import {db} from "@/core/db";
import {tenants} from "@/core/db/schema/tenants";
import {eq} from "drizzle-orm";

type CacheEntry = { id: string; expiresAt: number };

const slugCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 256;

export async function resolveTenantFromSlug(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.id;
  if (cached) slugCache.delete(slug);

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) return null;

  if (slugCache.size >= CACHE_MAX) {
    const oldestKey = slugCache.keys().next().value;
    if (oldestKey) slugCache.delete(oldestKey);
  }
  slugCache.set(slug, { id: tenant.id, expiresAt: Date.now() + CACHE_TTL_MS });
  return tenant.id;
}

export async function ensureTenantExists(slug: string): Promise<string> {
  const id = await resolveTenantFromSlug(slug);
  if (!id) throw new Error(`Tenant not found: ${slug}`);
  return id;
}

export function invalidateTenantCache(slug?: string) {
  if (slug) slugCache.delete(slug);
  else slugCache.clear();
}
