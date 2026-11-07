import {getTranslations} from "next-intl/server";
import {listAuditLogs} from "@/core/audit/audit.service";
import {requireTenantPermission} from "@/core/auth/session";
import {AUDIT_ACTIONS, type AuditAction, type AuditEntityType} from "@/core/db/schema/enums";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const { tenantId } = await requireTenantPermission("audit:read");

  const logs = await listAuditLogs(tenantId);

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">{t("audit.eyebrow")}</p>
        <h1 className="page-heading mt-1">{t("audit.title")}</h1>
        <p className="page-description">{t("audit.description")}</p>
      </div>

      {logs.length > 0 ? (
        <div className="surface-panel overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("audit.action")}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{t("audit.entity")}</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">{t("audit.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{actionLabel(t, l.action)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{l.entityType as AuditEntityType}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground/70">
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

const ACTION_KEY_BY_ACTION: Record<AuditAction, string> = {
  create: "audit.log.create",
  update: "audit.log.update",
  delete: "audit.log.delete",
};

function actionLabel(t: (key: string) => string, action: string) {
  const key = (AUDIT_ACTIONS as readonly string[]).includes(action) ? ACTION_KEY_BY_ACTION[action as AuditAction] : undefined;
  return key ? t(key) : action;
}
