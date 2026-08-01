import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";
import {users} from "@/core/db/schema/users";
import {desc, eq} from "drizzle-orm";

export default async function AuditPage() {
    const {tenantId} = await requireTenantPermission("audit:read");

    const logs = await db
        .select({
            id: auditLogs.id,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            createdAt: auditLogs.createdAt,
            userName: users.fullName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.createdAt))
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
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Действие</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Сущность</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Пользователь</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Дата</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {logs.map((l) => (
                            <tr key={l.id} className="transition-colors hover:bg-muted/50">
                                <td className="px-4 py-3 text-sm">{actionLabel(l.action)}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{l.entityType}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{l.userName ?? "—"}</td>
                                <td className="px-4 py-3 text-right text-sm text-muted-foreground">
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
