# MMMC Platform — AGENTS.md

## Stack
- Next.js 16 / React 19 / App Router / TypeScript
- Tailwind CSS v4 + custom UI primitives (Modal, ConfirmDialog, Toast)
- PostgreSQL + Drizzle ORM
- Custom auth (bcryptjs + session tokens in DB)
- Cloudflare R2 (files, minimal integration)
- Deploy: Docker → Cloudflare Pages

## Architecture
- **Modular Monolith** — code in `src/modules/*/` (19 dirs, many still empty)
- **Multi-Tenant** — Shared DB. `tenantId` passed explicitly as param to every service (no global/request-scoped state). Pages resolve via `ensureTenantExists(slug)`.
- **Layers per module**: Server Components/Pages → Service → Drizzle queries
- **No microservices, no Kafka/RabbitMQ, no Laravel/NestJS/Java/.NET/Prisma**
- **RBAC**: `admin`, `management_member`, `commandant`, `owner`. Defined in `src/core/auth/permissions.ts`.

## Commands (order: lint → typecheck → build)
- `bun run dev` — dev server
- `bun run build` — production build
- `bun run lint` — ESLint (Next.js, `--max-warnings 0`)
- `bun run typecheck` — `tsc --noEmit`
- `bun run db:generate` — Drizzle Kit generate
- `bun run db:migrate` — Drizzle Kit migrate
- `bun run db:seed` — seed DB (`tsx src/core/db/seed.ts`, loads dotenv manually)
- `bun run db:studio` — Drizzle Kit studio

## Conventions
- **Proxy**: Next.js 16 uses `src/proxy.ts` exporting a named `proxy` function (not `middleware`). Convention is deprecated, codemod: `npx @next/codemod@canary middleware-to-proxy .`
- **Soft delete** via `status` field set to `"deleted"`. No physical DELETE.
- **Immutable tables**: `transactions`, `audit_logs`, `votes`, `protocol_signatures` — no UPDATE/DELETE in application code.
- **Financial values**: `DECIMAL(12,2)` in DB, AZN only. Stored as strings in Drizzle.
- **Owner → Unit**: Creating an owner also creates a unit + ownership link in a single transaction (`createOwnerWithUnit`). Units are not created standalone.
- **No `shareNumerator`/`shareDenominator`** — removed. Ownership is binary (owner owns the unit).
- **No `id_number` (FIN)** — removed from owners.
- **Buildings module** was intentionally removed. One building per tenant is assumed.
- **Documents module** was intentionally removed.
- **Audit**: every mutation should call `writeAuditLog()` — not enforced by framework.

## DB notes
- Migrations in `drizzle/migrations/`. Tables are created via `drizzle-kit generate` + `drizzle-kit migrate`.
- RLS setup script at `scripts/rls-setup.sql` — not applied automatically.
- Postgres runs via Docker: `docker compose up -d db`.
- Seed creates: admin user, 10 owners, 20 units, 4 funds, 180 charges, 120 payments, meeting, voting, protocol, budget.

## Gotchas
- **Auth is custom** (not Better Auth) — `@better-auth/kysely-adapter` is incompatible with installed `kysely` version. Uses `bcryptjs` + DB sessions + httpOnly cookies.
- **tsx scripts** (seed, migrate) need `import "dotenv/config"` at top to load `.env`.
- **Session cookie** is set via `response.cookies.set()` on the `NextResponse` object, NOT via the mutable `cookies()` API.
- **Locale**: AZ primary, RU/EN secondary (next-intl planned but not wired). Strings are hardcoded in Russian.
- **Payments**: E-Manat API + POS terminals planned. Webhook placeholder at `src/app/api/webhooks/payment/`.
- **Storage**: `src/core/storage/storage.service.ts` — minimal R2 wrapper, not fully integrated.

## Project tree (key paths)
```
src/
├── app/              # App Router (public, auth, dashboard, api)
├── modules/          # 19 domain module dirs
│   ├── owner/        # CRUD + creates unit on creation
│   ├── unit/         # Read + soft-delete only (created via owner)
│   ├── finance/      # Charges + payments views
│   ├── voting/       # Voting with results bars
│   └── ...           # Most are empty scaffolds
├── core/             # db, auth, multi-tenant, audit, storage
├── components/ui/    # Modal, ConfirmDialog, Toast primitives
├── proxy.ts          # Next.js 16 proxy (was middleware.ts)
└── hooks/
drizzle/              # Schema + migrations
```
