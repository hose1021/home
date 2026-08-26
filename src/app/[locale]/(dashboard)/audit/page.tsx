import {eq} from "drizzle-orm";
import {getTranslations} from "next-intl/server";
import {requireTenantPermission} from "@/core/auth/session";
import {db} from "@/core/db";
import {auditLogs} from "@/core/db/schema/audit-logs";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const { tenantId } = await requireTenantPermission("audit:read");

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(auditLogs.createdAt)
    .limit(50);

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">{t("audit.eyebrow")}</p>
        <h1 className="page-heading mt-1">{t("audit.title")}</h1>
        <p className="page-description">{t("audit.description")}</p>
      </div>

      {logs.length > 0 ? (
        <div className="surface-panel overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{t("audit.action")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">{t("audit.entity")}</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">{t("audit.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {logs.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{actionLabel(t, l.action)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{l.entityType}</td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400">
                    {new Date(l.createdAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="surface-panel border-dashed p-10 text-center text-sm text-muted-foreground">{t("audit.empty")}</div>
      )}
    </div>
  );
}

const ACTION_KEY_BY_ACTION: Record<string, string> = {
  create: "audit.log.create",
  update: "audit.log.update",
  delete: "audit.log.delete",
  restore: "audit.log.restore",
  login: "audit.log.login",
  export: "audit.log.export",
};

function actionLabel(t: (key: string) => string, a: string) {
  const key = ACTION_KEY_BY_ACTION[a];
  return key ? t(key) : a;
}
