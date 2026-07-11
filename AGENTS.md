# MMMC Platform — AGENTS.md

## Stack
- Next.js 16 (Turbopack, App Router) / React 19 / TypeScript (strict, ES2022, `verbatimModuleSyntax`)
- Tailwind CSS v4 + shadcn-style UI primitives (`src/components/ui/`)
- PostgreSQL 16 + Drizzle ORM 0.45 (`postgres` driver)
- Custom auth (bcryptjs + DB session tokens, httpOnly cookie `session_token`)
- zod 4 for validation
- Vitest 4 (unit) — Playwright declared but **no config exists**, `test:e2e` will fail
- Deploy: Docker → Cloudflare Pages (`output: "standalone"`)

## Design System (required)
- The product UI follows the official shadcn block language, specifically the composition patterns from `login-04`, `dashboard-01`, `sidebar-09`, and `sidebar-16`. New work must extend this system instead of introducing a separate visual style.
- Overall direction: neutral zinc/black-and-white palette, restrained borders, `rounded-lg`/`rounded-xl`, subtle `shadow-sm`, compact spacing, strong typography hierarchy, and minimal decoration. Do not add glassmorphism, neon gradients, colored page glows, oversized radii, or arbitrary shadows.
- Use the shared primitives in `src/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `Textarea`, `Table`, `Tabs`, `Dialog`, `DropdownMenu`, etc.) instead of styling raw HTML controls. Add missing primitives with `npx shadcn@latest add <component>` and adapt them to the existing Base UI setup.
- Dashboard shell: keep the inset, icon-collapsible sidebar; sticky `--header-height` top bar; tenant brand in `SidebarHeader`; permission-filtered navigation groups; and profile dropdown in `SidebarFooter`. Preserve mobile sheet behavior and RBAC visibility.
- Every dashboard route must use `.page-shell`. Page intros use an optional muted eyebrow, `.page-heading`, and `.page-description`; actions sit to the right on desktop and stack below on mobile.
- Main content containers use `.surface-panel` or `Card`. Summary metrics follow `dashboard-01`: a four-card responsive grid, subtle `from-primary/5 to-card` vertical gradient, tabular numbers, and a small muted icon tile.
- Tables live inside an overflow-safe `.surface-panel`; headers use `bg-muted/50`; rows use `hover:bg-muted/50`; secondary values use `text-muted-foreground`. Avoid hardcoded `zinc-*` table borders when semantic tokens exist.
- Empty states use a dashed `.surface-panel`, centered muted icon, short title, and one-line explanation. Do not leave bare `Нет данных` text floating on a page.
- Forms and dialogs use a consistent vertical rhythm (`space-y-4`), semantic labels, shadcn inputs/selects/textareas, an outline cancel button, and a default primary submit button. Destructive actions use the destructive variant and require confirmation where appropriate.
- Status and role metadata use `Badge`; icon-only actions use `Button` with `variant="ghost"`, an icon size, and an accessible `aria-label`. Do not create one-off pill/button CSS if a primitive variant covers it.
- Login keeps the `login-04` split-card composition: form on the left, branded visual panel on desktop, one-column form on mobile. Authentication behavior must remain unchanged.
- Dark mode is first-class. Prefer semantic tokens (`background`, `foreground`, `card`, `muted`, `border`, `primary`, `destructive`) so both themes work without duplicate color rules.
- Validate visual changes at desktop and mobile widths. At minimum run lint, typecheck, tests, and build; visually check `/`, the dashboard, one list page, and one detail/dialog flow when those areas change.

## Commands (run in this order before committing)
- `bun run lint` — ESLint `--max-warnings 0` (fails on warnings)
- `bun run typecheck` — `tsc --noEmit`
- `bun run test` — Vitest (`src/**/*.test.ts`, node env, `@` alias resolved via `vitest.config.ts`)
- `bun run build` — production build
- `bun run dev` — dev server (Turbopack)

DB scripts (require `docker compose up -d db` first):
- `bun run db:generate` — Drizzle Kit generate migrations from `src/core/db/schema/index.ts`
- `bun run db:migrate` — apply migrations (uses `src/core/db/migrate.ts`, loads `DATABASE_URL` directly)
- `bun run db:seed` — `tsx src/core/db/seed.ts` (has `import "dotenv/config"` at top)
- `bun run db:studio` — Drizzle Studio

Run a single test file: `bun run vitest run src/core/auth/permissions.test.ts`

## Architecture
- **Modular Monolith** — `src/modules/*/`, 7 fully implemented: owner, unit, tenant, finance, meeting, announcements, tickets.
- **Layers per module**: Server Components/Pages → `*.actions.ts` (Server Actions) → `*.service.ts` → Drizzle queries. No REST API for domain ops — only `src/app/api/auth/*` exists.
- **Multi-Tenant** — Shared DB. `tenantId` passed explicitly as param to every service (no global/request-scoped state). Slug→id resolved via `ensureTenantExists(slug)` in `src/core/multi-tenant/` (in-process Map cache, TTL 60s — call `invalidateTenantCache(slug)` on tenant slug/name change). Cross-tenant access blocked in `requireTenantContext` (admin role bypasses).
- **RBAC**: roles `admin`, `management_member`, `commandant`, `owner` in `src/core/auth/permissions.ts` (56 permissions). Helpers: `hasPermission`, `hasAnyPermission`, `getPermissionsForRoles`, `ROLE_LABELS`, `ROLE_ORDER`. Session carries `roles: Role[]` (queried from `user_roles` on each `getSessionFromToken`). Enforce in server actions via `requirePermission(perm)` / `requireTenantPermission(slug, perm)` from `src/core/auth/session.ts`. **Every server action must call one.** UI hides controls via `permissions` passed from server pages (computed once in `[tenantSlug]/layout.tsx`, flows to sidebar + pages).
- **Audit**: `writeAuditLog()` in `src/core/audit/audit.service.ts` — call on every mutation. Not framework-enforced. Currently wired in: owner, unit, meeting, tenant, announcements, finance (charge/payment), tickets.

## Conventions
- **Proxy**: Next.js 16 uses `src/proxy.ts` exporting named `proxy` (not `middleware.ts`). Public paths: `/login`, `/register`, `/api/auth`, `/_next`. Does NOT validate sessions — only forwards `x-tenant-slug` header. Auth enforced in layouts/actions.
- **Soft delete** via `status` field set to `"deleted"` for owners, units, announcements. Tickets use hard DELETE (with cascading comments).
- **Immutable tables** (no UPDATE/DELETE in app code): `transactions`, `audit_logs`, `votes`, `protocol_signatures`.
- **Financial values**: `DECIMAL(12,2)`, AZN only. Drizzle returns as strings — use `Number(x).toFixed(2)`.
- **Owner → Unit**: `createOwnerWithUnit` creates user + owner + unit + ownership + `owner` role in one transaction. Units are not created standalone.
- **No `shareNumerator`/`shareDenominator`**, no `id_number` (FIN) — removed. Ownership is binary.
- **Buildings/Documents modules** intentionally removed. One building per tenant assumed.
- **Locale**: AZ primary, RU/EN secondary. next-intl declared but not wired — UI strings hardcoded in Russian.
- **tsconfig**: `noUncheckedIndexedAccess` is OFF (causes 50+ errors in seed.ts). Don't enable without refactoring seed.
- **ESLint**: `@typescript-eslint/no-explicit-any` warn, `consistent-type-imports` warn (inline-type-imports). Seed/migrate scripts exempt from `no-explicit-any`.

## Tickets module specifics
- **Statuses** (4): `pending` (На обсуждении) → `in_progress` (В процессе) → `done` (Выполнено) / `rejected` (Отклонено). `rejected` requires `rejectionReason` (server-validated in `updateTicketStatus`). `rejected`/`done` can reopen to `pending`. State machine in `ticket.service.ts` `isValidTransition`.
- **Categories**: plumbing, electrical, cleaning, structural, elevator, pest_control, **yard**, security, other.
- **Unit selection**: owner sees only their units (`getUnitsForUser`); staff sees all units (`getAllUnits`); option `__yard__` = `unitId: null` (общая территория).
- Migration `0013_ticket_status_overhaul.sql` drops `resolution`, adds `rejection_reason`.

## Finance module specifics
- **Tariff**: `MONTHLY_TARIFF_PER_SQM` env var (default 0.40 ₼/m²). Monthly fee = `area × tariff`. `BILLING_START_DATE` env var (format `YYYY-MM`, default `2025-01`) controls when debt accrual begins. Owner detail page generates periods from start date to current month — no `charges` rows needed for tariff-based periods.
- **Charge templates** (`charge_templates`): 4 seed templates — Yaşayış (40 ₼), Qeyri-yaşayış (100 ₼), Təmir fondu (30 ₼), Liftə xidmət (120 ₼). `calculation`: `fixed_per_unit`, `per_owner`, `percentage_of_income`.
- **Charges** (`charges`): generated per unit per period via `generateMonthlyCharges(tenantId, templateId, year, month, dueDate)`. Multiple charges per period per unit (one per template). Status: `pending` → `paid` / `partially_paid` / `overdue` / `cancelled`.
- **Payments** (`payments`): registered via `registerPayment` or inline `payForUnitAction`. Methods: `cash`, `bank_transfer`, `card`, `e_manat`, `pos_terminal`. `referenceNo` optional. Status: `confirmed` (set immediately, no approval flow).
- **Funds** (`funds`): target amount + current balance. Types: `reserve`, `repair`, `improvement`, `emergency`, `other`.
- **Owner detail page** (`owners/[ownerId]/page.tsx`): aggregates charges by period (sum across templates), joins with payments to show debt per period. `PayButton` dialog lets staff pick year/month/method/amount/referenceNo.
- **Finance dashboard** (`finance/page.tsx`): 4 summary cards + tabs (Начисления / Платежи / Фонды). Permission-gated buttons: `charge:write`, `payment:write`, `fund:write`.

## DB notes
- Schema in `src/core/db/schema/` (22 files), barrel export `index.ts`. 14 migrations (0000–0013).
- DB connection: `postgres://postgres:postgres@localhost:5432/mmcm` (database name is `mmcm`, user `postgres` — NOT `mmmc`).
- `drizzle-kit generate` may hit interactive prompt on column renames — create migration SQL manually in `drizzle/migrations/NNNN_name.sql` if it fails in non-TTY.
- RLS script `scripts/rls-setup.sql` mounted into Postgres container via `docker-compose.yml` — applied on first container init only.
- Seed is env-parameterized: `SEED_TENANT_SLUG`, `SEED_TENANT_NAME`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_OWNER_PASSWORD`, etc. Defaults: tenant `demo`, admin `admin.admin`/`admin123`.
- **Charges table starts empty** after seed — no charges are auto-generated. Use finance dashboard "Начислить" button or `generateMonthlyCharges()` to populate.

## Gotchas
- **Auth is custom** (not Better Auth) — `@better-auth/kysely-adapter` and `kysely` were removed. `next.config.ts` no longer lists them in `serverExternalPackages`.
- **tsx scripts** (seed) need `import "dotenv/config"` at top — `db:migrate` reads `DATABASE_URL` without dotenv.
- **Session cookie** set via `response.cookies.set()` on `NextResponse` in login route — NOT via mutable `cookies()` API.
- **`/api/auth/me`** returns `{ user: { ...session.user, permissions: Permission[] } }` — permissions computed via `getPermissionsForRoles`.
- **next.config.ts**: `turbopack.root: __dirname` set to silence multi-lockfile warning (a stray `package-lock.json` exists at `~/`). `output: "standalone"`, security headers on all routes, `poweredByHeader: false`.
- **Platform name**: `src/core/config.ts` `PLATFORM_NAME` from env `PLATFORM_NAME` (default "MMMC Platform"). Used in login page + root metadata. Tenant display name comes from DB (`tenants.name`), not hardcoded.
- **Storage**: `src/core/storage/storage.service.ts` — minimal R2 wrapper, `getSignedUrl` returns public path without auth headers. Not integrated.
- **Payments**: E-Manat API + POS terminals planned. Webhook placeholder at `src/app/api/webhooks/payment/` — not implemented.
- **Playwright**: `@playwright/test` in devDeps and `test:e2e` script exist, but no `playwright.config.*` — script will error.
- **tabs.tsx**: custom context-based implementation (not Radix). `Tabs` takes `defaultValue`/`value`/`onValueChange`. `TabsTrigger` and `TabsContent` require `value` prop.

## Key paths
```
src/
├── app/                          # App Router: /, /api/auth/*, (dashboard)/[tenantSlug]/*
├── modules/{owner,unit,tenant,finance,meeting,announcements,tickets}/
│   └── *.service.ts + *.actions.ts + components/
├── core/
│   ├── auth/                     # auth.ts, session.ts, permissions.ts, can.ts, *.test.ts
│   ├── db/schema/                # 22 schema files + index.ts barrel
│   ├── multi-tenant/             # slug→id resolver with Map cache
│   ├── audit/                    # writeAuditLog()
│   ├── storage/                  # R2 wrapper (stub)
│   └── config.ts                 # PLATFORM_NAME
├── components/ui/                # shadcn primitives (sidebar, dialog, alert-dialog, badge, button, card, tabs, table, label, textarea, ...)
└── proxy.ts                      # Next.js 16 proxy
drizzle/migrations/               # 0000–0013
vitest.config.ts                  # @ alias, node env
```
