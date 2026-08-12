# Commands and Validation

Run the quality gate in this order before committing:

```text
bun run lint
bun run typecheck
bun run test
bun run build
```

Database scripts require `docker compose up -d db`: `bun run db:generate`, `bun run db:migrate`,
`bun run db:seed`, and `bun run db:studio`. Run one test with
`bun run vitest run src/core/auth/permissions.test.ts`.

Key paths: `src/app/`, `src/modules/`, `src/core/auth/`, `src/core/db/schema/`,
`src/core/multi-tenant/`, `src/core/audit/`, `src/components/ui/`, `src/proxy.ts`,
`drizzle/migrations/`, and `vitest.config.ts`.
