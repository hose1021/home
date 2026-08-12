# MMMC Platform — Agent Instructions

Keep this file short. Read linked context only when the task needs it.

## Non-negotiable rules

- Preserve existing user changes. Inspect `git status` before editing.
- Use the existing Next.js/App Router, modular-monolith, multi-tenant architecture.
- Every server action must enforce authorization with `requirePermission(...)` or
  `requireTenantPermission(...)`.
- Call `writeAuditLog()` for every mutation.
- Keep tenant isolation enforced in both service queries and database constraints.
- Treat `transactions`, `audit_logs`, `votes`, and `protocol_signatures` as immutable.
- Financial values are AZN `DECIMAL(12,2)`; Drizzle returns them as strings.
- Use shared UI primitives and semantic theme tokens. Preserve dark mode and mobile behavior.

## How to work

- Use the task-appropriate model tier and context budget from
  [`docs/agent-context/model-routing.md`](docs/agent-context/model-routing.md).
- Delegate investigation, routine implementation, and diff review by default according to
  [`docs/agent-context/subagent-workflow.md`](docs/agent-context/subagent-workflow.md).
- Load detailed product and code context only when relevant:
  - [`docs/agent-context/design-system.md`](docs/agent-context/design-system.md)
  - [`docs/agent-context/engineering-context.md`](docs/agent-context/engineering-context.md)
  - [`docs/agent-context/domain-context.md`](docs/agent-context/domain-context.md)
  - [`docs/agent-context/commands-and-validation.md`](docs/agent-context/commands-and-validation.md)

## Language

Agent rules and durable context are concise English. Preserve user-facing product text,
domain labels, exact error strings, and code identifiers in their original form.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

@RTK.md
