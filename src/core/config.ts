export const PLATFORM_NAME = process.env.PLATFORM_NAME ?? "MMMC Platform";
export const ORG_TERM_RU = "организация";

export const TENANT_SLUG = process.env.TENANT_SLUG ?? process.env.SEED_TENANT_SLUG ?? "pilot-residence";

export function getTenantSlug(): string {
  return TENANT_SLUG;
}

export function getTariffPerSqm(): number {
  return Number(process.env.MONTHLY_TARIFF_PER_SQM ?? "0.40");
}

export function getBillingStartDate(): string {
  return process.env.BILLING_START_DATE ?? "2025-01";
}
