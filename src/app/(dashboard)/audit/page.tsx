import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {eq} from "drizzle-orm";

export default async function AuditPage() {
    const {tenantId} = await requireTenantPermission("audit:read");

    const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(auditLogs.createdAt)
        .limit(50);

    return (
        <div className="page-shell">
            <div>
                <p className="text-sm text-muted-foreground">Безопасность и контроль</p>
                <h1 className="page-heading mt-1">Аудит</h1>
                <p className="page-description">История изменений и действий пользователей</p>
            </div>

            {logs.length > 0 ? (
                <div className="surface-panel overflow-hidden">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Действие</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Сущность</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Дата</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {logs.map((l) => (
                            <tr key={l.id} className="transition-colors hover:bg-muted/50">
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
                <div className="surface-panel border-dashed p-10 text-center text-sm text-muted-foreground">История аудита будет отображаться по мере выполнения операций</div>
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
