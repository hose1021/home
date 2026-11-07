import {getTranslations} from "next-intl/server";
import {requireTenantPermission} from "@/core/auth/session";
import {listCommandants} from "@/modules/commandants/commandant.service";
import {listOwnerOptions} from "@/modules/owner/owner.service";
import {CommandantAddButton} from "./commandant-add-button";
import {CommandantsBoard} from "./commandants-board";

export default async function CommandantsPage() {
  const {tenantId} = await requireTenantPermission("settings:read");
  const t = await getTranslations("commandants");

  const [commandants, ownerOptions] = await Promise.all([
    listCommandants(tenantId),
    listOwnerOptions(tenantId),
  ]);

  return (
    <div className="page-shell">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
        <CommandantAddButton owners={ownerOptions} />
      </div>
      <CommandantsBoard commandants={commandants} owners={ownerOptions} />
    </div>
  );
}
