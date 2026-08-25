import {and, eq, ne} from "drizzle-orm";
import {db} from "@/core/db";
import {owners} from "@/core/db/schema/owners";
import {requireTenantPermission} from "@/core/auth/session";
import {listCommandants} from "@/modules/commandants/commandant.service";
import {CommandantsBoard} from "./commandants-board";
import {CommandantAddButton} from "./commandant-add-button";

export default async function CommandantsPage() {
  const {tenantId} = await requireTenantPermission("settings:read");

  const [commandants, ownerOptions] = await Promise.all([
    listCommandants(tenantId),
    db
      .select({ id: owners.id, fullName: owners.fullName, phone: owners.phone })
      .from(owners)
      .where(and(eq(owners.tenantId, tenantId), ne(owners.status, "deleted")))
      .orderBy(owners.fullName),
  ]);

  return (
    <div className="page-shell max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Управление домом</p>
          <h1 className="page-heading mt-1">Коменданты</h1>
          <p className="page-description">Действующие и прошлые коменданты дома</p>
        </div>
        <CommandantAddButton owners={ownerOptions} />
      </div>
      <CommandantsBoard commandants={commandants} owners={ownerOptions} />
    </div>
  );
}
