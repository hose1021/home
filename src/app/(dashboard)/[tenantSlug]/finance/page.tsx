import { ensureTenantExists } from "@/core/multi-tenant";
import { db } from "@/core/db";
import { charges } from "@/core/db/schema/charges";
import { payments } from "@/core/db/schema/payments";
import { funds } from "@/core/db/schema/funds";
import { eq, sql, and } from "drizzle-orm";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

  const [chargeTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
    .from(charges)
    .where(eq(charges.tenantId, tenantId));

  const [paymentTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "confirmed")));

  const [debtTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
    .from(charges)
    .where(and(eq(charges.tenantId, tenantId), eq(charges.status, "pending")));

  const fundList = await db
    .select()
    .from(funds)
    .where(eq(funds.tenantId, tenantId));

  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      status: payments.status,
    })
    .from(payments)
    .where(eq(payments.tenantId, tenantId))
    .orderBy(payments.paymentDate)
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Финансы</h1>
        <p className="text-sm text-zinc-500">Учёт доходов, расходов и фондов</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceCard title="Всего начислено" value={`${Number(chargeTotal?.total ?? 0).toFixed(2)} ₼`} />
        <FinanceCard title="Поступило" value={`${Number(paymentTotal?.total ?? 0).toFixed(2)} ₼`} />
        <FinanceCard title="Задолженность" value={`${Number(debtTotal?.total ?? 0).toFixed(2)} ₼`} />
        <FinanceCard title="Фондов" value={`${fundList.length} шт.`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Фонды</h2>
          <div className="space-y-3">
            {fundList.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-zinc-400">{f.type}</p>
                </div>
                <span className="font-medium">{Number(f.currentBalance).toFixed(2)} ₼</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Последние платежи</h2>
          {recentPayments.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{new Date(p.paymentDate).toLocaleDateString("ru")}</span>
                  <span className="font-medium">{p.amount} ₼</span>
                  <span className="text-xs text-zinc-400">{p.paymentMethod}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Нет данных</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
