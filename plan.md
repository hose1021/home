# MMMC Platform — План улучшений

## P0 — Критические

### 1. RBAC: подключить `hasPermission` в server actions
- [ ] Расширить `getSessionFromToken` → возвращать `roles: Role[]`
- [ ] Расширить `session.ts`: `getSession()` → `{ user, roles }`
- [ ] Добавить `requirePermission(perm: Permission)` в `session.ts`
- [ ] Добавить `requireTenantContext(slug)` → `{ session, tenantId }` с tenant-проверкой
- [ ] Обновить все `*.actions.ts`: вызывать `requirePermission` перед мутацией

### 2. Cross-tenant изоляция
- [ ] `ensureTenantAccess(slug, userTenantId)` в multi-tenant — сверка `session.user.tenantId === tenant.id`
- [ ] Обновить все actions: использовать `requireTenantContext` вместо `requireAuth + ensureTenantExists`

### 3. Audit в owner/unit/meeting
- [ ] `owner.service.ts`: audit в createOwnerWithUnit, updateOwnerWithRoles, deleteOwner
- [ ] `unit.service.ts`: audit в createUnit, updateUnit, deleteUnit (передавать userId)
- [ ] `meeting.service.ts`: audit в createMeeting, updateMeeting, deleteMeeting (передавать userId)

## P1 — Высокий приоритет

### 4. next.config: удалить рудименты + security headers
- [ ] Убрать `serverExternalPackages: ["kysely", "@better-auth/kysely-adapter"]`
- [ ] Добавить `output: "standalone"`, `poweredByHeader: false`
- [ ] Добавить security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

### 5. Vitest config + smoke тесты
- [ ] `vitest.config.ts`
- [ ] Тест `permissions.test.ts` — hasPermission для всех ролей
- [ ] Тест `auth.test.ts` — hashPassword/verifyPassword/normalizeUsername/assertValidUsername

### 6. N+1 фикс в voting/meetings
- [ ] `voting/page.tsx`: JOIN с агрегацией votes вместо Promise.all на каждый voting
- [ ] `meetings/page.tsx`: JOIN с count agendas/attendees

## P2 — Средний приоритет

### 7. tsconfig ужесточение
- [ ] `target: ES2022`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noFallthroughCasesInSwitch`

### 8. ESLint правила
- [ ] `@typescript-eslint/no-explicit-any` warn
- [ ] `import/order` правило

### 9. Slug→id кэш
- [ ] `lru-cache` для `resolveTenantFromSlug` (TTL 60s)

### 10. UI примитивы
- [ ] Добавить `select`, `form`, `label`, `textarea`, `table` из shadcn

## P3 — Низкий приоритет

### 11. AGENTS.md актуализация
- [ ] Убрать «19 dirs», buildings/documents упоминания
- [ ] Обновить список модулей

### 12. Proxy rate-limiting на login
- [ ] Simple in-memory counter на `/api/auth/login`

### 13. Storage R2 интеграция
- [ ] Подписанные URL, auth-заголовки

### 14. Дашборд хардкод
- [ ] Заменить «Pilot Residence» на `tenant.name`

### 15. Доменные модули (крупно)
- [ ] protocols, tickets, work-orders, contractors, residents, notifications, funds, budgets, management-members
