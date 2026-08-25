import {requireTenantPermission} from "@/core/auth/session";
import {IconTool} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";

export default async function ContractorsPage() {
  await requireTenantPermission("contractor:read");
  const t = await getTranslations("contractors");

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
      </div>
      <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconTool className="size-5" /></span>
        <p className="mt-4 font-medium">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
      </div>
    </div>
  );
}
