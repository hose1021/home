import {listTenants} from "../tenant.service";

export async function TenantList() {
  const tenants = await listTenants();

  return (
    <div className="space-y-2">
      {tenants.map((tenant) => (
        <div
          key={tenant.id}
          className="rounded-[4px] border border-border p-4 dark:border-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{tenant.name}</h3>
              <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-success/12 border-success/35 text-success">
              {tenant.status}
            </span>
          </div>
          {tenant.address && (
            <p className="mt-1 text-sm text-muted-foreground/70">{tenant.address}</p>
          )}
        </div>
      ))}
      {tenants.length === 0 && (
        <p className="text-sm text-muted-foreground/70">Нет зарегистрированных организаций</p>
      )}
    </div>
  );
}
