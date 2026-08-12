# Subagent Workflow

Use the local `cavecrew` presets by default when they fit the task. Their compact output keeps
the main context focused.

## Routing

- `cavecrew-investigator`: locate definitions, callers, tests, and relevant files.
- `cavecrew-builder`: surgical edit when scope is clear and limited to one or two files.
- `cavecrew-reviewer`: inspect a diff or file for actionable defects.
- Main thread: cross-cutting changes, three or more files, or decisions requiring full context.

## Default sequence

1. Investigate in parallel when the search has multiple independent angles.
2. Give the builder exact paths and line ranges; keep the request narrow.
3. Run the reviewer after edits.
4. Main thread integrates findings and runs validation.

Do not delegate sensitive decisions without supplying the relevant security and domain context.
Do not use a builder for an unclear or multi-file refactor. Delegated output should contain
paths, line numbers, a short finding/change, and verification status.
