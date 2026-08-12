# Domain Context

## Tickets

Statuses: `pending` → `in_progress` → `done`/`rejected`; rejected needs `rejectionReason`, and
done/rejected can reopen to pending. Categories include plumbing, electrical, cleaning, structural,
elevator, pest_control, yard, security, and other. Owners see their units; staff see all units;
`__yard__` maps to `unitId: null`.

## Finance

- Monthly tariff is `area × MONTHLY_TARIFF_PER_SQM`; `BILLING_START_DATE` controls accrual start.
- Charge templates seed four fixed examples; charges are generated per unit/period/template.
- Payments are immediately `confirmed`; supported methods are cash, bank_transfer, card, e_manat,
  and pos_terminal.
- Funds have target/current balance and types reserve, repair, improvement, emergency, other.
- Owner detail aggregates charges by period and joins payments to show debt.

## Database

Schema lives in `src/core/db/schema/`; migrations live in `drizzle/migrations/`. DB name is `mmcm`.
RLS setup runs only on first container initialization. Seed is environment-parameterized, and charges
start empty after seed. Create manual SQL migrations if Drizzle rename generation becomes interactive.

## Gotchas

Custom auth is not Better Auth. `tsx` seed scripts need `import "dotenv/config"`; migration reads
`DATABASE_URL` directly. The login route sets cookies on `NextResponse`. Payment webhooks and storage
are placeholders. Playwright is declared but has no config unless one is added.
