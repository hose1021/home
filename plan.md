# MMMC Platform — План улучшений

Статус по факту (2026-08). Сделано — отмечено. Остаток — открытые пункты.

## P0 — Критические (сделано)

### 1. RBAC в server actions — ✅
`requireTenantPermission(perm)` в session.ts; вызывается во всех `*.actions.ts` и страницах.

### 2. Cross-tenant изоляция — ✅
`requireTenantContext` + tenant-проверки; tenant-scope во всех сервисных запросах; RLS: `scripts/rls-setup.sql`.

### 3. Audit во всех мутациях — ✅
`writeAuditLog` в owner/unit/meeting/payment/charge/budget/ticket/announcement/commandant/tenant/settings.

### 4. Точки правды в финансах — ✅ (метки)
Долг каноничен: один `debt.service.ts` (переиспользуют owner/report). Семантики балансов разведены явными метками: «Плановый баланс» (бюджет) / «Фактический баланс» (отчёт) / «Баланс фонда».
Известные мёртвые поля (не реализовано, см. P1.6/P1.7): `budget_items.actual_amount` и `funds.current_balance` пишутся только сидом.

### 5. Квитанция об оплате — ✅
`/receipt/[paymentId]` (вне dashboard, print-CSS, ноль зависимостей). Кнопка печати в истории платежей. Доступ: `payment:read` + владелец только свой платёж.

### 6. E2E путь денег — ✅
`e2e/money-path.spec.ts`: логин → владелец → оплата → квитанция → отчёт. Идемпотентен. Прогон: `npm run test:e2e` (нужна засеянная БД: `npm run db:migrate && npm run db:seed`).

### 7. Ops — ✅
`Dockerfile` (standalone, multi-stage, стадия `migration`), `docker-compose.prod.yml` (db+migrate+app), `scripts/deploy.sh` (одна команда), `scripts/db-backup.sh` (pg_dump через контейнер + ротация 30 дней; restore-drill проверен).

## P1 — Высокий приоритет

### 1.1 next.config — ✅
`output: "standalone"`, `poweredByHeader: false`, security headers (CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS, Permissions-Policy).

### 1.2 Vitest + smoke — ✅
12 файлов, 90 тестов зелёные (debt, payment, report, budget, auth/permissions, owner, dashboard, ticket). Playwright: 2 e2e зелёные.

### 1.3 N+1 в voting/meetings — ✅
voting: JOIN + `sum(vote_weight)` с группировкой. meetings: батчевый `IN` для повесток. N+1 нет.

### 1.4 Ввод фактических расходов — ✅
`budgetItems.actualAmount` редактируется в UI (поле «Факт»), факт разрешён в утверждённом бюджете, план остаётся заморожен (`planFieldsChanged` — численное сравнение, 3 unit-теста). Отчёт «Доходы и расходы» отражает факт (E2E).

### 1.5 Пополнение фондов — ✅
`fund.service.topUpFund`: SQL-арифметика `current_balance + delta` (атомарно, без lost update), транзакция + аудит. UI «Пополнить» на дашборде, переводы ru/az/en. E2E по конкретному фонду.

### 1.6 tsconfig ужесточение — ✅
`noUncheckedIndexedAccess` включён; 157 ошибок исправлены (guards для `returning()`, нормализованные сравнения).

### 1.7 ESLint — ✅
`no-explicit-any: warn` + `import/order` (groups + alphabetize) через `eslint-plugin-import`; автоправка применена по всему репо (131 файл), lint чистый.

## P2 — Средний приоритет

### 2.1 Slug→id кэш — ✅
`src/core/multi-tenant/index.ts`: Map + TTL 60s, лимит 256, `invalidateTenantCache`. Без новой зависимости.

### 2.2 UI примитивы — ✅ (частично)
`ui/select.tsx` на Base UI (Select/Value/Trigger/Content/Item). Применён в контролируемых формах: PaymentForm (квартира/способ/месяц), FundCreateForm (тип), ChargeGenerateForm (шаблон/месяц). Остальные ~19 мест (формы на `FormData`/`name`, фильтры таблиц) оставлены на нативных `<select>` осознанно: Base UI Select технически поддерживает `name`/`form`/`required` (hidden input), но массовая миграция форм — риск регрессий в submit/валидации ради косметики; переводить по мере доработки форм.

### 2.3 Хранение (R2)
Подписанные URL, auth-заголовки (модуль storage отсутствует).

## P3 — Низкий приоритет

### 3.1 Rate-limiting на login — ✅
`login-rate-limit.ts` (in-memory, 5 фейлов / 15 мин по ip+username).

### 3.2 Дашборд-хардкод — ✅
«Pilot Residence» в коде не захардкожен; имя берётся из `tenant.name`.

### 3.3 Доменные модули (крупно) — ✅ (кроме documents)
Реализованы: **contractors** (CRUD), **management-members** (правление, CRUD), **work-orders** (наряды: создание + статусы), **residents** (жители: заселение/выселение), **protocols** (создание + подпись, счётчик подписей), **notifications** (личные, in_app: отправка + «прочитано»). У каждого: сервис с tenant-scope, actions с `requireTenantPermission`, аудит, страница, переводы ru/az/en, пункты меню.
БД-изоляция: композитные tenant-FK (residents/units, work_orders/tickets+contractors, protocols/meetings, notifications/users, management_members/owners), UNIQUE(tenant_id, id) в users/tickets/contractors/meetings, исправлены фейковые unique (protocols×2, budgets, transactions, user_roles) — миграции 0022, 0023.
E2E: `e2e/modules.spec.ts` (contractor + член правления через UI).
**documents** — ⏳ отложен: требует storage-решения (R2 отменён, P2.3).
