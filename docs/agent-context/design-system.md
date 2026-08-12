# Design System

The UI follows shadcn block composition patterns from `login-04`, `dashboard-01`, `sidebar-09`,
and `sidebar-16`. Extend the existing system; do not introduce a separate visual language.

- Use neutral semantic tokens, restrained borders, compact spacing, `rounded-lg`/`rounded-xl`,
  subtle shadows, and strong typography hierarchy.
- Do not add glassmorphism, neon gradients, page glows, oversized radii, or arbitrary shadows.
- Reuse primitives in `src/components/ui/`; use `.page-shell`, `.surface-panel`, and `Card`.
- Preserve the inset icon-collapsible sidebar, sticky header, tenant brand, RBAC navigation,
  profile footer, mobile sheet behavior, and dark mode.
- Tables need overflow-safe panels, semantic muted headers/rows, and muted secondary values.
- Empty states need a dashed panel, muted icon, short title, and one-line explanation.
- Forms/dialogs use `space-y-4`, semantic labels, shared controls, outline cancel, primary submit,
  and confirmation for destructive actions.
- Validate visual changes at desktop and mobile widths when UI areas change.
