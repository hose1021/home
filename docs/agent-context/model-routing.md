# Model Routing

Model selection is a runtime/provider concern, not a repository invariant. Do not hardcode a
specific model in `AGENTS.md`, source code, or shared prompts.

## Default tiers

| Work | Tier | Guidance |
|---|---|---|
| Architecture, security, migrations, ambiguous bugs, final review | strong | Spend quality budget where mistakes are expensive. |
| Normal feature coding, refactors, tests, documentation | standard | Default implementation tier. |
| File lookup, formatting, simple tests, summaries, mechanical edits | fast | Keep prompts narrow and require a compact result. |

Route by task risk, not by brand or a permanent model name. Use the provider's configured alias,
environment setting, or session default. If no routing mechanism exists, keep the policy here as
guidance only; do not invent a fake model configuration.

## Context budget

- Start with the smallest relevant file set.
- Use search/symbol extraction before reading whole files.
- Start a fresh context for independent work.
- Ask delegated agents for structured, compact output.
- Re-check tests and critical assumptions after context compression.

## Escalate

Escalate from fast to standard or strong when the task touches authentication, authorization,
tenant isolation, payments, migrations, production incidents, or repeated failed attempts.
