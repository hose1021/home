# Repository Guidelines

## Project Overview

MMMC Platform (`mmmc-platform`) is a multi-tenant modular monolith for managing an apartment building: buildings, units, owners and residents, finance (tariff charges, payments, allocations, debts), meetings, votings and protocols, tickets, work orders, contractors, documents, announcements and audit logs.

Stack: Next.js 16 App Router, React 19, TypeScript (strict), PostgreSQL 16, Drizzle ORM (postgres.js driver), next-intl, Tailwind CSS v4 with shadcn/base-ui primitives, Vitest and Playwright.

The repository is indexed with CodeGraph (`.codegraph/`). Prefer `codegraph_*` tools for symbol, call-flow and impact questions; use `grep`/`read` for configs, SQL, translations and other literal text.

## Architecture & Data Flow

- **One tenant per session.** The tenant comes from the authenticated session (`session.user.tenantId`), never from the URL, query string or client payload. `src/proxy.ts` only applies next-intl locale middleware.
- **Server-first rendering.** A page (`src/app/[locale]/(dashboard)/<section>/page.tsx`) calls `requireTenantPermission("x:read")`, then a module service, then renders props into client components. `src/app/[locale]/(dashboard)/layout.tsx` enforces the session and renders the sidebar shell.
- **Layering:** `page.tsx` → guard → `src/modules/<name>/<name>.service.ts` → Drizzle. Services are server-only by directory convention (no `server-only` import marker) and **every function takes `tenantId` as its first argument** and filters with `eq(table.tenantId, tenantId)`.
- **Mutations:** `"use server"` actions in `src/modules/<name>/<name>.actions.ts` (or module-internal `*.actions.ts`) parse zod input, check permissions, call the service, call `revalidatePath`, and return `{ success: true }` (or `{ success: true, count }`). Client components call actions directly and show results with `sonner` toasts. No REST layer for ordinary mutations.
- **API routes** (`src/app/api/**`) exist only where a non-React consumer needs them: auth cookies (`auth/login`, `auth/logout`, `auth/me`, `auth/register`), CSV export (`finance/export`), and the service worker.
- **Authorization:** roles `admin | management_member | commandant | owner`; permissions are `"<resource>:<read|write>"` strings in `src/core/auth/permissions.ts` with an explicit `rolePermissions` matrix. Server guards: `requireAuth`, `requirePermission`, `requireTenantPermission`, `requireTenantMutation`, `requirePlatformPermission`. Hiding UI is never authorization.
- **Errors:** services throw `AppError` / `DomainError` subclasses from `src/core/errors/app-error.ts`; actions convert domain codes with `translateDomainError(err, t)`.
- **Finance model:** one charge per unit per billing period = unit area × `tenants.tariffPerSqm`; a payment is allocated oldest-due-first to charges, with the remainder stored as advance; outstanding debt is derived from charges and allocations, never recomputed from tariff. Money is stored as `numeric(12,2)` strings and arithmetic goes through `src/modules/finance/services/money.ts` (`moneyToCents`) — never floating point.
- **Multi-tenant scoping:** registration and tenant administration resolve slug → tenant id via `src/core/multi-tenant/`; runtime tenant scoping is enforced by application filters. `scripts/rls-setup.sql` provides optional Postgres RLS, but no runtime code sets `app.current_tenant_id`, so it is not the active enforcement path.

## Key Directories

| Path | Purpose |
|---|---|
| `src/app/[locale]/` | Localized routes: `(dashboard)` authenticated shell, `login`, `receipt/[paymentId]` |
| `src/app/api/` | Auth cookie endpoints, finance CSV export |
| `src/modules/<name>/` | Business modules: services, server actions, components, colocated tests |
| `src/core/` | Cross-cutting infrastructure: `db`, `auth`, `errors`, `validation`, `audit`, `storage`, `multi-tenant`, `config.ts` |
| `src/core/db/schema/` | One Drizzle table module per file, aggregated in `schema/index.ts` |
| `src/components/ui/` | shadcn/base-ui primitives (the only shared UI primitives location) |
| `src/components/` | App-level composites: sidebar, navigation, filters, date range picker, theme, status badge |
| `src/i18n/` | Locale routing, request config, navigation wrappers (`Link`, `redirect`, `useRouter`) |
| `src/hooks/` | Shared client hooks (`use-mobile.ts`) |
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `drizzle/migrations/` | Generated SQL migrations `00NN_slug.sql` plus `meta/` journal/snapshots |
| `messages/` | Translation catalogs `ru.json`, `az.json`, `en.json` |
| `e2e/` | Playwright browser specs |
| `scripts/` | Ops scripts: production migrator, deploy, backup, allocation backfill, RLS SQL |

## Development Commands

```bash
cp .env.example .env
docker compose up -d db
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

| Command | Purpose |
|---|---|
| `bun run dev` | Next dev server on `http://localhost:3000` |
| `bun run build` / `bun run start` | Production build (standalone) / serve |
| `bun run lint` | ESLint, fails on warnings (`--max-warnings 0`) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` / `bun run test:watch` | Vitest unit tests |
| `bun run test:e2e` | Playwright (needs a seeded database and a running app) |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply migrations (`src/core/db/migrate.ts`) |
| `bun run db:seed` | Seed demo tenant, users and finance data |
| `bun run db:studio` | Drizzle Studio |
| `bun run db:backfill` | Backfill payment allocations |

Quality gate before commit, in this order: `lint` → `typecheck` → `test` → `build`.

## Code Conventions & Common Patterns

- **Imports:** `@/*` → `src/*`. `verbatimModuleSyntax` is on: use `import type`. ESLint enforces alphabetized `import/order` groups. Import page-level internal links from `@/i18n/navigation`, not `next/link`.
- **File naming:** services `<name>.service.ts`, actions `<name>.actions.ts`, validators `<name>.validators.ts`, constants `<name>.constants.ts`, tests `<name>.service.test.ts` colocated beside the source, UI primitives kebab-case under `src/components/ui/`, component files PascalCase or kebab-case but exported components are PascalCase.
- **Service functions:** verbs `get*`, `list*`, `create*`, `update*`, `delete*`, `generate*`, `sync*`, `allocate*`; pure helpers `derive*`, `compute*`, `build*`. Types are `typeof table.$inferSelect`, `*Input`, `*View`, `*Status` unions.
- **Server/client boundary:** add `"use client"` at the top of every interactive component; keep server services free of React imports; keep client-safe constants and pure helpers in separate `.constants.ts` / `mime.ts` files without server imports.
- **Validation:** zod v4. Shared primitives live in `src/core/validation/action-schemas.ts` (`uuidSchema`, `moneySchema`, `shortText`, …). Actions `parse()` and throw rather than returning `safeParse` results.
- **Multi-tenancy rules (non-negotiable):** resolve `tenantId` server-side from the session; pass it explicitly into services; always filter by it; verify ownership for owner-facing writes; never trust a client-supplied tenant id.
- **Permissions:** before using a new permission string, add it to the `Permission` union and the correct `rolePermissions` entries in `src/core/auth/permissions.ts`, and cover it in `permissions.test.ts`.
- **Database changes:** add or edit a file in `src/core/db/schema/`, re-export it from `schema/index.ts`, then run `bun run db:generate`. Do not hand-edit applied migrations. Column conventions: `pgTable("<snake_plural>")`, `uuid("id").defaultRandom().primaryKey()`, camelCase property with an explicit snake_case column name, `tenantId` FK to `tenants.id`, `timestamp(..., { withTimezone: true })` for times, `numeric(12,2)` for money, `varchar` + `$type<Union>()` + `check()` for enums, composite `unique()` constraints.
- **Audit:** record mutations with `writeAuditLog` from `src/core/audit/audit.service.ts`. Audit rows are immutable.
- **Translations:** add every key to **all three** catalogs `messages/{ru,az,en}.json` under the feature namespace. Client components use `useTranslations("namespace")`; server components use `await getTranslations()`. Default locale is `ru`; `localePrefix: "always"`.
- **UI:** compose from `src/components/ui/*`; use `cn()` for class merging and `cva` for variants. Tailwind v4 is CSS-first in `src/app/globals.css` — there is no `tailwind.config`; theme tokens and helpers (`.field`, `.btn-solid`, `.btn-soft`) live there.
- **Formatting gotcha:** `bun run format` calls Prettier, but Prettier is not installed and no config exists. Do not rely on it; match the surrounding style and let ESLint validate.
- **Currency/locale formatting** goes through `src/modules/finance/money-format.ts`; do not format money ad hoc.

## Important Files

- `package.json` — scripts and dependency list; `next.config.ts` — standalone output, CSP/security headers, 25 MB server-action limit, next-intl plugin.
- `tsconfig.json` — strict flags (`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`) and `@/*` alias.
- `eslint.config.mjs` — flat config: Next core-web-vitals + TypeScript, alphabetized imports, `consistent-type-imports`.
- `drizzle.config.ts` — schema entry `src/core/db/schema/index.ts`, output `drizzle/migrations`.
- `src/core/db/index.ts` — postgres.js + Drizzle singleton (cached on `globalThis` outside production).
- `src/core/auth/session.ts` — `session_token` httpOnly cookie, sha256-hashed tokens, 7-day expiry; `src/core/auth/permissions.ts` — RBAC matrix.
- `src/i18n/routing.ts` / `request.ts` / `navigation.ts` — locales, catalogs, locale-aware navigation.
- `src/app/[locale]/(dashboard)/layout.tsx` — authenticated shell; `src/components/nav-main.tsx` — permission-gated navigation.
- `src/modules/finance/services/` — charge, payment, allocation, debt, expense, analytics services (the core money logic).
- `scripts/migrate.mjs` — migration runner used by the production image; `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `scripts/deploy.sh`, `scripts/db-backup.sh`.

## Runtime/Tooling Preferences

- **Bun is the local package manager and script runner** (`bun.lock`); the Docker image builds with `npm ci` against `package-lock.json`. Both lockfiles are committed — keep them in sync when dependencies change.
- Docker runs Node 22 (`node:22-alpine`), multi-stage standalone build; production compose adds a one-shot `migrate` service, a Postgres healthcheck and a persistent `documents` volume.
- Required environment variables: `DATABASE_URL`, `PLATFORM_NAME`, `NEXT_PUBLIC_APP_URL`, `ALLOW_PUBLIC_REGISTRATION`, `SEED_*` overrides, optional `R2_ENDPOINT`/`R2_BUCKET_NAME`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, and `DOCUMENTS_DIR` (local document storage; required by prod compose). `.env*` stays untracked except `.env.example`.
- Public registration is off by default; enable only for controlled onboarding. Seed passwords must be replaced outside local use.
- No CI configuration exists in the repository; run the quality gate locally.

## Testing & QA

- **Vitest** (`vitest.config.ts`): `node` environment, include `src/**/*.test.ts`, alias `@` → `./src`, no globals. Tests are colocated with source. No database is used: DB seams are mocked with `vi.hoisted` + `vi.mock("@/core/db")`, and storage is injected (`InMemoryStorage`). Existing specs cover auth/RBAC/sessions/rate limiting, finance money math (payments, allocations, debts, reports), ticket status transitions, dashboard ranking, and document upload/storage (including path-traversal rejection).
- **Playwright** (`playwright.config.ts`): `testDir: ./e2e`, Chromium only, `baseURL` from `PLAYWRIGHT_BASE_URL` or `http://127.0.0.1:3000`, starts the app via `npm run dev` unless a base URL is supplied, retries 2 on CI. Specs (`smoke`, `modules`, `money-path`, `finance-edits`) log in with seeded credentials and require a migrated + seeded database. The README statement that E2E is not configured is stale.
- Run a single unit test: `bunx vitest run src/modules/finance/services/allocation.service.test.ts` or filter with `-t "..."`. Run one e2e spec: `bunx playwright test e2e/money-path.spec.ts`.
- No coverage thresholds are configured. For new domain logic, add a focused colocated unit test next to the service (money math, status transitions, tenant/ownership guards, error codes) rather than testing wiring or incidental UI text.
- Verify behavior, not just compilation: run the affected test file, and for UI-facing changes exercise the real page in a browser.
