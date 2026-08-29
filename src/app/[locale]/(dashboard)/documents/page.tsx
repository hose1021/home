import {getTranslations} from "next-intl/server";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {listDocuments} from "@/modules/document/document.service";
import {DocumentsBoard} from "./documents-board";

export default async function DocumentsPage() {
  const {session, tenantId} = await requireTenantPermission("document:read");
  const t = await getTranslations("documents");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);
  const canManage = permissions.includes("document:write");
  const documents = await listDocuments(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <DocumentsBoard documents={documents} canManage={canManage} />
    </div>
  );
}
