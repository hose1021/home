# Engineering Context

- Stack: Next.js 16 App Router/Turbopack, React 19, strict TypeScript, Tailwind v4, PostgreSQL 16,
  Drizzle 0.45, custom bcrypt/session auth, Zod 4, Vitest 4.
- Architecture: modular monolith under `src/modules/*`; pages/components → server actions →
  services → Drizzle queries. No REST domain API; only auth routes exist.
- Multi-tenancy: pass `tenantId` explicitly. Resolve slugs with `ensureTenantExists`; invalidate
  its 60-second cache after tenant slug/name changes. `requireTenantContext` blocks cross-tenant access;
  admin bypass is intentional.
- RBAC roles are `admin`, `management_member`, `commandant`, and `owner`; enforce permissions in
  server actions and pass computed permissions from the tenant layout to the UI.
- Next.js 16 uses named `proxy` in `src/proxy.ts`; it forwards `x-tenant-slug` but does not validate
  sessions. Auth belongs in layouts/actions.
- Soft delete owners, units, and announcements via `status`; tickets use cascading hard delete.
- Locale: AZ primary, RU/EN secondary. `next-intl` is declared but not wired; UI strings remain
  hardcoded in Russian. Do not translate product strings as part of rule-file slimming.
- `noUncheckedIndexedAccess` is intentionally off. ESLint warning behavior and script exemptions
  are documented in the command reference.

See `src/core/`, `src/modules/`, and the key-path map in the command reference when needed.
