# MMMC Platform

Платформа управления многоквартирным домом: собственники и помещения, финансы, собрания, объявления, заявки и аудит действий. Приложение построено как multi-tenant модульный монолит на Next.js 16, React 19, TypeScript, PostgreSQL и Drizzle ORM.

## Локальный запуск

Требуются Bun и Docker.

```bash
cp .env.example .env
docker compose up -d db
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

Приложение откроется на [http://localhost:3000](http://localhost:3000). Значения seed по умолчанию задаются в `.env.example`; перед использованием вне локальной среды обязательно замените пароли.

## Проверки качества

Перед коммитом команды выполняются в указанном порядке:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Unit-тесты запускаются Vitest. Playwright установлен, но E2E-конфигурация пока не добавлена, поэтому `bun run test:e2e` ещё не является рабочей проверкой.

## База данных

```bash
bun run db:generate  # создать миграцию из схемы
bun run db:migrate   # применить миграции
bun run db:seed      # заполнить демо-данными
bun run db:studio    # открыть Drizzle Studio
```

Локальная база по умолчанию: `postgres://postgres:postgres@localhost:5432/mmcm`. Финансовые начисления seed не создаёт автоматически: их нужно сформировать на странице финансов.

## Безопасность и конфигурация

- Сессия хранится в httpOnly-cookie `session_token`.
- Доступ к каждому tenant проверяется на сервере по slug и tenant ID; UI-скрытие кнопок не заменяет RBAC.
- Публичная регистрация выключена по умолчанию. Включайте `ALLOW_PUBLIC_REGISTRATION=true` только для контролируемого onboarding-сценария.
- `MONTHLY_TARIFF_PER_SQM` задаёт тариф в AZN за м², `BILLING_START_DATE` — первый расчётный месяц в формате `YYYY-MM`.
- Файлы `.env*` не должны попадать в репозиторий, кроме уже отслеживаемого шаблона `.env.example`.

Архитектурные соглашения и обязательные правила разработки описаны в `AGENTS.md`.
