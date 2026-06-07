import { listTenants } from "../tenant.service";

export async function TenantList() {
  const tenants = await listTenants();

  return (
    <div className="space-y-2">
      {tenants.map((tenant) => (
        <div
          key={tenant.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{tenant.name}</h3>
              <p className="text-sm text-zinc-500">/{tenant.slug}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              {tenant.status}
            </span>
          </div>
          {tenant.address && (
            <p className="mt-1 text-sm text-zinc-400">{tenant.address}</p>
          )}
        </div>
      ))}
      {tenants.length === 0 && (
        <p className="text-sm text-zinc-400">Нет зарегистрированных MMMC</p>
      )}
    </div>
  );
}
