export const PLATFORM_NAME = process.env.PLATFORM_NAME ?? "MMMC Platform";

const TENANT_SLUG = process.env.TENANT_SLUG ?? process.env.SEED_TENANT_SLUG ?? "pilot-residence";

export function getTenantSlug(): string {
  return TENANT_SLUG;
}
