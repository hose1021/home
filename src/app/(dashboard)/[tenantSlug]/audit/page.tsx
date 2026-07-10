import {ensureTenantExists} from "@/core/multi-tenant";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {eq} from "drizzle-orm";

export default async function AuditPage({
    params,
}: {
    params: Promise<{ tenantSlug: string }>;
}) {
    const {tenantSlug} = await params;
    const tenantId = await ensureTenantExists(tenantSlug);

    const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(auditLogs.createdAt)
        .limit(50);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Аудит</h1>
                <p className="text-sm text-zinc-500">История изменений и действий пользователей</p>
            </div>

            {logs.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Действие</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Сущность</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Дата</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {logs.map((l) => (
                            <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                <td className="px-4 py-3 text-sm">{actionLabel(l.action)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-500">{l.entityType}</td>
                                <td className="px-4 py-3 text-right text-sm text-zinc-400">
                                    {new Date(l.createdAt).toLocaleString("ru")}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-zinc-400">История аудита будет отображаться по мере выполнения операций</p>
            )}
        </div>
    );
}

function actionLabel(a: string) {
    const map: Record<string, string> = {
        create: "Создание", update: "Изменение", delete: "Удаление",
        restore: "Восстановление", login: "Вход", export: "Экспорт",
    };
    return map[a] ?? a;
}
